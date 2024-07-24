use anyhow::{Error, Result};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::Command;

// TODO: we require wasm-as allowing import after non-import to make our implementation easier.
// This worked in 9784f012848a7eb321c2037bdb363dfe0eab8bc9, and not in 6b93a84032cd00840c797d52ac01a7ca3bcb913e
// This is just for a convenience and workaround seems possible.

const PRE_FUNC: i32 = -1;
const POST_FUNC: i32 = -2;

pub fn generate(
    out_dir: &PathBuf,
    orig_wat_path: PathBuf,
    int_list: Vec<i32>,
    parent_dir: &std::path::Path,
) -> Result<String, Error> {
    let orig_part_path = out_dir.join("orig_part.wat");
    let orig_rest_path = out_dir.join("orig_rest.wat");
    let mut func_name = "".to_string();
    let (rest_fidx_to_body, part_fidx_to_body) =
        collect_infos(orig_wat_path, &int_list, &mut func_name)?;
    write_to_wat(
        orig_rest_path.clone(),
        orig_part_path.clone(),
        rest_fidx_to_body,
        part_fidx_to_body,
        int_list,
    )?;
    wat_to_wasm(orig_rest_path, orig_part_path, out_dir, parent_dir)?;
    Ok(func_name)
}

fn collect_infos(
    orig_wat_path: PathBuf,
    int_list: &Vec<i32>,
    func_name: &mut String,
) -> Result<(HashMap<i32, Vec<String>>, HashMap<i32, Vec<String>>), Error> {
    let orig_file = fs::File::open(&orig_wat_path)?;
    let reader = BufReader::new(orig_file);
    let mut rest_fidx_to_body: HashMap<i32, Vec<String>> = HashMap::new();
    let mut part_fidx_to_body: HashMap<i32, Vec<String>> = HashMap::new();
    let mut in_func = false;
    let mut curr_func = -1;
    for (_index, line) in reader.lines().enumerate() {
        let line = line?;
        if line.starts_with("(module") || line.starts_with("  (type") {
            rest_fidx_to_body
                .entry(PRE_FUNC)
                .or_insert_with(Vec::new)
                .push(line.clone());
            part_fidx_to_body
                .entry(PRE_FUNC)
                .or_insert_with(Vec::new)
                .push(line);
            continue;
        }
        if line.starts_with("  (func") {
            curr_func += 1;
            in_func = true;
            if int_list.contains(&curr_func) {
                let (rest_line, _extracted_name) = rest_transform_func(&line);
                let (part_line, extracted_name) = part_transform_func(&line);
                *func_name = extracted_name;
                rest_fidx_to_body
                    .entry(curr_func)
                    .or_insert_with(Vec::new)
                    .push(rest_line);
                part_fidx_to_body
                    .entry(curr_func)
                    .or_insert_with(Vec::new)
                    .push(part_line);
                continue;
            } else {
                let (rest_line, _extracted_name) = rest_export_func(&line);
                let (part_line, _extracted_name) = part_import_func(&line);
                rest_fidx_to_body
                    .entry(curr_func)
                    .or_insert_with(Vec::new)
                    .push(rest_line);
                part_fidx_to_body
                    .entry(curr_func)
                    .or_insert_with(Vec::new)
                    .push(part_line);
                continue;
            }
        } else if line.starts_with("  )") {
            in_func = false;
            rest_fidx_to_body
                .entry(curr_func)
                .or_insert_with(Vec::new)
                .push(line.clone());
            if int_list.contains(&curr_func) {
                part_fidx_to_body
                    .entry(curr_func)
                    .or_insert_with(Vec::new)
                    .push(line);
            }
            continue;
        }
        if line.starts_with("  (memory") {
            rest_fidx_to_body
                .entry(POST_FUNC)
                .or_insert_with(Vec::new)
                .push(rest_transform_memory(&line));
            part_fidx_to_body
                .entry(PRE_FUNC)
                .or_insert_with(Vec::new)
                .push(part_transform_memory(&line));
            continue;
        }
        if line.starts_with("  (table") {
            rest_fidx_to_body
                .entry(POST_FUNC)
                .or_insert_with(Vec::new)
                .push(rest_transform_table(&line));
            part_fidx_to_body
                .entry(PRE_FUNC)
                .or_insert_with(Vec::new)
                .push(part_transform_table(&line));
            continue;
        }
        if line.starts_with("  (global") {
            rest_fidx_to_body
                .entry(POST_FUNC)
                .or_insert_with(Vec::new)
                .push(rest_transform_global(&line));
            part_fidx_to_body
                .entry(PRE_FUNC)
                .or_insert_with(Vec::new)
                .push(part_transform_global(&line));
            continue;
        }
        if line.starts_with("  (export") {
            rest_fidx_to_body
                .entry(POST_FUNC)
                .or_insert_with(Vec::new)
                .push(rest_transform_global(&line));
            continue;
        }
        match (in_func, int_list.contains(&curr_func)) {
            (true, true) => {
                part_fidx_to_body
                    .entry(curr_func)
                    .or_insert_with(Vec::new)
                    .push(line);
            }
            (true, false) => {
                rest_fidx_to_body
                    .entry(curr_func)
                    .or_insert_with(Vec::new)
                    .push(line);
            }
            (false, _) => {
                rest_fidx_to_body
                    .entry(POST_FUNC)
                    .or_insert_with(Vec::new)
                    .push(line.clone());
                part_fidx_to_body
                    .entry(POST_FUNC)
                    .or_insert_with(Vec::new)
                    .push(line);
            }
        }
    }
    Ok((rest_fidx_to_body, part_fidx_to_body))
}

fn write_to_wat(
    orig_rest_path: PathBuf,
    orig_part_path: PathBuf,
    rest_fidx_to_body: HashMap<i32, Vec<String>>,
    part_fidx_to_body: HashMap<i32, Vec<String>>,
    int_list: Vec<i32>,
) -> Result<(), Error> {
    let mut rest_file = fs::File::create(&orig_rest_path)?;
    let prefunc_string = rest_fidx_to_body.get(&PRE_FUNC).unwrap().join("\n");
    let postfunc_string = rest_fidx_to_body.get(&POST_FUNC).unwrap().join("\n");
    let func_string: String = int_list
        .iter()
        .filter_map(|&func_idx| match rest_fidx_to_body.get(&func_idx) {
            Some(v) => Some(v.join("\n")),
            None => None,
        })
        .collect::<Vec<String>>()
        .join("\n");
    let mut rest_fidx_to_body_vec: Vec<(i32, Vec<String>)> = rest_fidx_to_body
        .iter()
        .filter(|(idx, _)| !int_list.contains(idx) && *idx != &PRE_FUNC && *idx != &POST_FUNC)
        .map(|(idx, v)| (*idx, v.clone()))
        .collect();
    rest_fidx_to_body_vec.sort_by_key(|(idx, _)| *idx);
    let func_string_2: String = rest_fidx_to_body_vec
        .iter()
        .map(|(_, v)| v.join("\n"))
        .collect::<Vec<String>>()
        .join("\n");

    // TODO: move export declarations into its own to make diff smaller
    let func_export = "";
    writeln!(
        rest_file,
        "{prefunc_string}\n{func_string}\n{func_string_2}\n{func_export}\n{postfunc_string}"
    )?;

    let prefunc_string = part_fidx_to_body.get(&PRE_FUNC).unwrap().join("\n");
    let postfunc_string = part_fidx_to_body.get(&POST_FUNC).unwrap().join("\n");
    let func_string: String = int_list
        .iter()
        .filter_map(|&func_idx| match part_fidx_to_body.get(&func_idx) {
            Some(v) => Some(v.join("\n")),
            None => None,
        })
        .collect::<Vec<String>>()
        .join("\n");
    let mut part_fidx_to_body_vec: Vec<(i32, Vec<String>)> = part_fidx_to_body
        .iter()
        .filter(|(idx, _)| !int_list.contains(idx) && *idx != &PRE_FUNC && *idx != &POST_FUNC)
        .map(|(idx, v)| (*idx, v.clone()))
        .collect();
    part_fidx_to_body_vec.sort_by_key(|(idx, _)| *idx);
    let func_string_2: String = part_fidx_to_body_vec
        .iter()
        .map(|(_, v)| v.join("\n"))
        .collect::<Vec<String>>()
        .join("\n");

    // TODO: move export declarations into its own to make diff smaller
    let func_export = "";
    let mut part_file = fs::File::create(&orig_part_path)?;
    writeln!(
        part_file,
        "{prefunc_string}\n{func_string_2}\n{func_string}\n{func_export}\n{postfunc_string}"
    )?;
    Ok(())
}

fn wat_to_wasm(
    orig_rest_path: PathBuf,
    orig_part_path: PathBuf,
    out_dir: &PathBuf,
    parent_dir: &std::path::Path,
) -> Result<(), Error> {
    let binding = out_dir.join("orig_rest.wasm");
    let args = [
        "parse",
        orig_rest_path.to_str().unwrap(),
        "-o",
        binding
            .to_str()
            .ok_or_else(|| Error::msg("Invalid output path"))?,
    ];
    let output = Command::new("wasm-tools")
        .args(&args)
        .current_dir(parent_dir)
        .output()?;
    if !output.status.success() {
        let error_message = String::from_utf8_lossy(&output.stderr);
        return Err(Error::msg(format!(
            "wasm-tools parse for rest failed: {}",
            error_message
        )));
    }
    let binding = out_dir.join("orig_part.wasm");
    let args = [
        "parse",
        orig_part_path.to_str().unwrap(),
        "-o",
        binding
            .to_str()
            .ok_or_else(|| Error::msg("Invalid output path"))?,
    ];
    let output = Command::new("wasm-tools")
        .args(&args)
        .current_dir(parent_dir)
        .output()?;
    Ok(if !output.status.success() {
        let error_message = String::from_utf8_lossy(&output.stderr);
        return Err(Error::msg(format!(
            "wasm-tools parse for part failed: {}",
            error_message
        )));
    })
}

fn rest_transform_func(line: &str) -> (String, String) {
    if line.trim().starts_with("(func ") {
        let parts: Vec<&str> = line.trim_start().splitn(3, ' ').collect();
        if parts.len() >= 2 {
            let func_keyword = parts[0];
            let func_name = parts[1];
            let rest = parts[2..].join(" ");
            return (
                format!("  {func_keyword} {func_name} (import \"part\" \"{func_name}\") {rest}",),
                func_name.to_string(),
            );
        }
    }
    unreachable!("{line}")
}

fn rest_export_func(line: &str) -> (String, String) {
    if line.trim().starts_with("(func ") {
        let parts: Vec<&str> = line.trim_start().splitn(3, ' ').collect();
        if parts.len() >= 2 {
            let func_keyword = parts[0];
            let func_name = parts[1];
            let rest = parts[2..].join(" ");
            let var_name = (
                format!("  {func_keyword} {func_name} (export \"{func_name}\") {rest}",),
                func_name.to_string(),
            );
            return var_name;
        }
    }
    unreachable!("{line}")
}

fn part_import_func(line: &str) -> (String, String) {
    if line.trim().starts_with("(func ") {
        let parts: Vec<&str> = line.trim_start().splitn(3, ' ').collect();
        if parts.len() >= 2 {
            let func_keyword = parts[0];
            let func_name = parts[1];
            let rest = parts[2..].join(" ");
            let var_name = (
                format!("  {func_keyword} {func_name} (import \"rest\" \"{func_name}\") {rest})",),
                func_name.to_string(),
            );
            return var_name;
        }
    }
    unreachable!("{line}")
}

fn part_transform_func(line: &str) -> (String, String) {
    if line.trim().starts_with("(func ") {
        let parts: Vec<&str> = line.trim_start().splitn(3, ' ').collect();
        if parts.len() >= 2 {
            let func_keyword = parts[0];
            let func_name = parts[1];
            let rest = parts[2..].join(" ");
            return (
                format!(
                    "  {} {} (export \"{}\") {}",
                    func_keyword, func_name, func_name, rest
                ),
                func_name.to_owned(),
            );
        }
    }
    unreachable!()
}

fn rest_transform_memory(line: &str) -> String {
    if line.trim().starts_with("(memory ") {
        let parts: Vec<&str> = line.trim_start().splitn(3, ' ').collect();
        if parts.len() >= 2 {
            let memory_keyword = parts[0];
            let memory_name = parts[1];
            let rest = parts[2..].join(" ");
            return format!(
                "  {} {} (export \"r3_memory\") {}",
                memory_keyword, memory_name, rest
            );
        }
    }
    line.to_string()
}

fn part_transform_memory(line: &str) -> String {
    if line.trim().starts_with("(memory ") {
        let parts: Vec<&str> = line.trim_start().splitn(3, ' ').collect();
        if parts.len() >= 2 {
            let memory_keyword = parts[0];
            let memory_name = parts[1];
            let rest = parts[2..].join(" ");
            return format!(
                "  {} {} (import \"rest\" \"r3_memory\") {}",
                memory_keyword, memory_name, rest
            );
        }
    }
    line.to_string()
}

fn rest_transform_table(line: &str) -> String {
    if line.trim().starts_with("(table ") {
        let parts: Vec<&str> = line.trim_start().splitn(3, ' ').collect();
        if parts.len() >= 2 {
            let table_keyword = parts[0];
            let table_name = parts[1];
            let rest = parts[2..].join(" ");
            return format!(
                "  {} {} (export \"r3_table\") {}",
                table_keyword, table_name, rest
            );
        }
    }
    line.to_string()
}

fn part_transform_table(line: &str) -> String {
    if line.trim().starts_with("(table ") {
        let parts: Vec<&str> = line.trim_start().splitn(3, ' ').collect();
        if parts.len() >= 2 {
            let table_keyword = parts[0];
            let table_name = parts[1];
            let rest = parts[2..].join(" ");
            return format!(
                "  {} {} (import \"rest\" \"r3_table\") {}",
                table_keyword, table_name, rest
            );
        }
    }
    line.to_string()
}

fn rest_transform_global(line: &str) -> String {
    if line.trim().starts_with("(global ") {
        let parts: Vec<&str> = line.trim_start().splitn(3, ' ').collect();
        if parts.len() >= 2 {
            let global_keyword = parts[0];
            let global_name = parts[1];
            let rest = parts[2..].join(" ");
            return format!(
                "  {} {} (export \"{global_name}\") {}",
                global_keyword, global_name, rest
            );
        }
    }
    line.to_string()
}

fn part_transform_global(line: &str) -> String {
    if line.trim().starts_with("(global ") {
        let parts: Vec<&str> = line.trim_start().splitn(5, ' ').collect();
        if parts.len() >= 3 {
            let global_keyword = parts[0];
            let global_name = parts[1];
            let global_type = if parts[2] == "(mut" && parts.len() >= 4 {
                format!("(mut {})", parts[3])
            } else {
                format!("{})", parts[2].to_string())
            };
            return format!(
                "  {} {} (import \"rest\" \"{}\") {}",
                global_keyword, global_name, global_name, global_type
            );
        }
    }
    line.to_string()
}
