//! IRGenerator is a tool to generate a replay IR from a trace file. The IR has type Replay.
//! It keeps the auxiliary states needed at field state.
//! Its main job is to put the right HostEvent into a right spot.
//! HostEvent corresponds to some event in the host context, which is classified into the effect
//! it has on wasm state. They get translated into different host code depending on the backend.
use std::collections::{BTreeMap, HashSet};

use walrus::Module;

use crate::trace::{Trace, ValType, WasmEvent, F64};

const MAX_WASM_FUNCTIONS: usize = 1000000;
pub const INIT_INDEX: usize = MAX_WASM_FUNCTIONS + 1;

pub struct IRGenerator {
    pub replay: Replay,
    state: State,
    flag: bool,
}
#[derive(Clone, Debug)]
pub struct Replay {
    pub funcs: BTreeMap<usize, Function>,
    pub tables: BTreeMap<usize, Table>,
    pub mems: BTreeMap<usize, Memory>,
    pub globals: BTreeMap<usize, Global>,
}

impl Replay {
    pub fn imported_funcs(&self) -> BTreeMap<usize, Function> {
        self.funcs
            .iter()
            .filter(|(_, function)| function.import.is_some())
            .map(|(key, function)| (*key, function.clone()))
            .collect()
    }
    pub fn exported_funcs(&self) -> BTreeMap<usize, Function> {
        self.funcs
            .iter()
            .filter(|(_, function)| function.export.is_some())
            .map(|(key, function)| (*key, function.clone()))
            .collect()
    }

    pub fn imported_tables(&self) -> BTreeMap<usize, Table> {
        self.tables
            .iter()
            .filter(|(_, table)| table.import.is_some())
            .map(|(key, table)| (*key, table.clone()))
            .collect()
    }
    pub fn exported_tables(&self) -> BTreeMap<usize, Table> {
        self.tables
            .iter()
            .filter(|(_, table)| table.export.is_some())
            .map(|(key, table)| (*key, table.clone()))
            .collect()
    }
    pub fn imported_mems(&self) -> BTreeMap<usize, Memory> {
        self.mems
            .iter()
            .filter(|(_, mem)| mem.import.is_some())
            .map(|(key, mem)| (*key, mem.clone()))
            .collect()
    }
    pub fn exported_mems(&self) -> BTreeMap<usize, Memory> {
        self.mems
            .iter()
            .filter(|(_, mem)| mem.export.is_some())
            .map(|(key, mem)| (*key, mem.clone()))
            .collect()
    }
    pub fn imported_globals(&self) -> BTreeMap<usize, Global> {
        self.globals
            .iter()
            .filter(|(_, global)| global.import.is_some())
            .map(|(key, global)| (*key, global.clone()))
            .collect()
    }
    pub fn exported_globals(&self) -> BTreeMap<usize, Global> {
        self.globals
            .iter()
            .filter(|(_, global)| global.export.is_some())
            .map(|(key, global)| (*key, global.clone()))
            .collect()
    }
    pub fn imported_modules(&self) -> Vec<String> {
        let mut vec = Vec::new();

        vec.extend(self.funcs.iter().filter_map(|(_, function)| {
            function.import.as_ref().map(|import| import.module.clone())
        }));
        vec.extend(
            self.tables
                .iter()
                .filter_map(|(_, table)| table.import.as_ref().map(|import| import.module.clone())),
        );
        vec.extend(
            self.mems
                .iter()
                .filter_map(|(_, mem)| mem.import.as_ref().map(|import| import.module.clone())),
        );
        vec.extend(
            self.globals.iter().filter_map(|(_, global)| {
                global.import.as_ref().map(|import| import.module.clone())
            }),
        );
        // delete duplicate
        let set: HashSet<String> = vec.drain(..).collect();
        vec.extend(set.into_iter());
        vec
    }
}

struct State {
    host_call_stack: Vec<(usize, usize)>,
    fidx_to_invoccount: BTreeMap<usize, usize>,
    last_func: (usize, usize),
}

#[derive(Clone, Debug)]
pub enum HostEvent {
    ExportCall {
        idx: usize,
        name: String,
        params: Vec<F64>,
    },
    ExportCallTable {
        idx: usize,
        table_name: String,
        funcidx: i32,
        params: Vec<F64>,
    },
    GrowMemory {
        amount: i32,
        import: bool,
    },
    GrowTable {
        idx: usize,
        amount: i32,
        import: bool,
        name: String,
    },
    MutateMemory {
        addr: i32,
        data: Vec<F64>,
        import: bool,
    },
    MutateGlobal {
        idx: usize,
        value: F64,
        valtype: ValType,
        import: bool,
    },
    MutateTable {
        tableidx: usize,
        funcidx: usize,
        idx: usize,
        func_import: bool,
        func_name: String,
        import: bool,
        name: String,
    },
}

#[derive(Clone, Debug, PartialEq)]
pub struct WriteResult {
    pub results: Vec<F64>,
    pub reps: i32,
}

pub type Context = Vec<HostEvent>;

#[derive(Clone, Debug)]
pub struct Import {
    pub module: String,
    pub name: String,
}
#[derive(Clone, Debug)]

pub struct Export {
    pub name: String,
}

#[derive(Clone, Debug)]
pub struct Function {
    pub import: Option<Import>,
    pub export: Option<Export>,
    pub bodys: Vec<Option<Context>>,
    pub results: Vec<WriteResult>,
    pub ty: FunctionTy,
}

#[derive(Clone, Debug)]
pub struct FunctionTy {
    pub params: Vec<ValType>,
    pub results: Vec<ValType>,
}

#[derive(Clone, Debug)]
pub struct Memory {
    pub import: Option<Import>,
    pub export: Option<Export>,
    pub initial: u64,
    pub maximum: Option<u64>,
    pub shared: bool,
}

#[derive(Clone, Debug)]
pub struct Table {
    pub import: Option<Import>,
    pub export: Option<Export>,
    pub reftype: ValType,
    pub initial: u64,
    pub maximum: Option<u64>,
}

#[derive(Clone, Debug)]
pub struct Global {
    pub import: Option<Import>,
    pub export: Option<Export>,
    pub mutable: bool,
    pub initial: F64,
    pub valtype: ValType,
}

impl IRGenerator {
    pub fn new(module: Module) -> Self {
        let mut funcs = BTreeMap::new();
        let mut mems = BTreeMap::new();
        let mut tables = BTreeMap::new();
        let mut globals = BTreeMap::new();
        funcs.insert(
            INIT_INDEX,
            Function {
                import: Some(Import {
                    module: "main".to_string(),
                    name: "initialization".to_string(),
                }),
                export: None,
                ty: FunctionTy {
                    params: vec![],
                    results: vec![],
                },
                bodys: vec![Some(vec![])],
                results: vec![],
            },
        );
        for f in module.funcs.iter() {
            let import = match &f.kind {
                walrus::FunctionKind::Import(i) => Some(Import {
                    module: module.imports.get(i.import).module.to_string(),
                    name: module.imports.get(i.import).name.to_string(),
                }),
                _ => None,
            };
            let export = module.exports.get_exported_func(f.id()).map(|e| Export {
                name: e.name.to_string(),
            });
            let ty = FunctionTy {
                params: module
                    .types
                    .get(f.ty())
                    .params()
                    .iter()
                    .map(|p| (*p).into())
                    .collect(),
                results: module
                    .types
                    .get(f.ty())
                    .results()
                    .iter()
                    .map(|p| (*p).into())
                    .collect(),
            };
            funcs.insert(
                f.id().index(),
                Function {
                    import,
                    export,
                    ty,
                    bodys: vec![],
                    results: vec![],
                },
            );
        }

        for g in module.globals.iter() {
            let import = match g.kind {
                walrus::GlobalKind::Import(i) => Some(Import {
                    module: module.imports.get(i).module.to_string(),
                    name: module.imports.get(i).name.to_string(),
                }),
                walrus::GlobalKind::Local(_) => None,
            };
            let export = module.exports.get_exported_global(g.id()).map(|e| Export {
                name: e.name.to_string(),
            });
            globals.insert(
                g.id().index(),
                Global {
                    import,
                    export,
                    valtype: g.ty.into(),
                    mutable: g.mutable,
                    // this is wrong, which will be updated by ImportGlobal
                    // TODO: more elegant solution
                    initial: F64(0.0),
                },
            );
        }

        for t in module.tables.iter() {
            let import = match t.import {
                Some(i) => Some(Import {
                    module: module.imports.get(i).module.to_string(),
                    name: module.imports.get(i).name.to_string(),
                }),
                None => None,
            };
            let export = module.exports.get_exported_table(t.id()).map(|e| Export {
                name: e.name.to_string(),
            });
            tables.insert(
                t.id().index(),
                Table {
                    import,
                    export,
                    reftype: ValType::Funcref,
                    initial: t.initial,
                    maximum: t.maximum,
                },
            );
        }

        for m in module.memories.iter() {
            let import = match m.import {
                Some(i) => Some(Import {
                    module: module.imports.get(i).module.to_string(),
                    name: module.imports.get(i).name.to_string(),
                }),
                None => None,
            };
            let export = module.exports.get_exported_memory(m.id()).map(|e| Export {
                name: e.name.to_string(),
            });
            mems.insert(
                m.id().index(),
                Memory {
                    import,
                    export,
                    initial: m.initial,
                    maximum: m.maximum,
                    shared: m.shared,
                },
            );
        }
        Self {
            replay: Replay {
                funcs,
                tables,
                mems,
                globals,
            },
            // INIT_INDEX is the _start function
            state: State {
                host_call_stack: vec![(INIT_INDEX, 0)], //
                fidx_to_invoccount: BTreeMap::new(),
                last_func: (INIT_INDEX, 0),
            },
            flag: true,
        }
    }

    pub fn generate_replay(&mut self, trace: Trace) -> &Replay {
        for event in trace.into_iter() {
            self.consume_event(&event);
        }
        &self.replay
    }

    fn push_call(&mut self, event: HostEvent) {
        self.flag = true;
        let (idx, invoc_count) = self.state.host_call_stack.last().unwrap();
        let current_context = self.idx_to_cxt(*idx, *invoc_count);

        if let Some(current_context) = current_context {
            current_context.push(event.clone())
        }
    }

    fn consume_event(&mut self, event: &WasmEvent) {
        match event {
            WasmEvent::FuncEntry { idx, name, params } => {
                self.push_call(HostEvent::ExportCall {
                    idx: idx.clone(),
                    name: name.clone(),
                    params: params.clone(),
                });
            }
            WasmEvent::FuncEntryTable {
                idx,
                tablename,
                tableidx: funcidx,
                params,
            } => {
                self.push_call(HostEvent::ExportCallTable {
                    idx: *idx,
                    table_name: tablename.clone(),
                    funcidx: *funcidx,
                    params: params.clone(),
                });
            }
            WasmEvent::FuncReturn => {}
            WasmEvent::Load {
                idx,
                offset,
                data,
            } => {
                self.splice_event(HostEvent::MutateMemory {
                    import: self.replay.imported_mems().contains_key(&idx),
                    addr: *offset,
                    data: data.clone(),
                });
            }
            WasmEvent::MemGrow { idx, amount } => {
                self.splice_event(HostEvent::GrowMemory {
                    import: self.replay.imported_mems().contains_key(idx),
                    amount: *amount,
                });
            }
            WasmEvent::TableGet {
                tableidx,
                name,
                idx,
                funcidx,
                funcname,
            } => {
                    self.splice_event(HostEvent::MutateTable {
                    tableidx: *tableidx,
                    funcidx: *funcidx,
                        import: self.replay.imported_tables().contains_key(&tableidx),
                    name: name.clone(),
                    idx: *idx as usize,
                    func_import: self.replay.imported_funcs().contains_key(funcidx),
                    func_name: funcname.clone(),
                    });
            }
            WasmEvent::TableGrow { idx, name, amount } => {
                self.splice_event(HostEvent::GrowTable {
                    import: self.replay.imported_tables().contains_key(idx),
                    name: name.clone(),
                    idx: *idx,
                    amount: *amount,
                });
            }
            WasmEvent::GlobalGet {
                idx,
                value,
            } => {
                let global = self.replay.globals.get(&idx).unwrap();

                self.splice_event(HostEvent::MutateGlobal {
                    idx: *idx,
                    import: self.replay.imported_globals().contains_key(&idx),
                    value: *value,
                    valtype: global.valtype.clone(),
                });
            }

            WasmEvent::ImportCall { idx } => {
                self.replay
                    .funcs
                    .get_mut(idx)
                    .unwrap()
                    .bodys
                    .push(Some(vec![]));
                let next_invoc_count = match self.state.fidx_to_invoccount.get(idx).cloned() {
                    Some(count) => count + 1,
                    None => 0,
                };
                self.state.fidx_to_invoccount.insert(*idx, next_invoc_count);

                self.state.host_call_stack.push((*idx, next_invoc_count));
                self.state.last_func = (*idx, next_invoc_count);
            }
            WasmEvent::ImportReturn {
                idx: _idx,
                results,
            } => {
                self.flag = false;
                let (current_fn_idx, _) = self.state.host_call_stack.last().unwrap();
                let r = &mut self.replay.funcs.get_mut(&current_fn_idx).unwrap().results;
                r.push(WriteResult {
                    results: results.clone(),
                    reps: 1,
                });
                self.state.last_func = self.state.host_call_stack.pop().unwrap();
            }
            WasmEvent::ImportGlobal {
                idx,
                initial,
            } => match self.replay.globals.get_mut(idx) {
                Some(g) => g.initial = *initial,
                None => todo!(),
            },
        }
    }
    fn splice_event(&mut self, event: HostEvent) {
        let flag = self.flag;
        let (idx, invoc_count) = self.state.host_call_stack.last().unwrap();
        let current_context = self.idx_to_cxt(*idx, *invoc_count);

        if flag {
            if let Some(current_context) = current_context {
                current_context.insert(current_context.len() - 1, event)
            }
        } else {
            let (last_idx, invoc_count) = &self.state.last_func;
            let last_context = self.idx_to_cxt(*last_idx, *invoc_count);
            if let Some(last_context) = last_context {
                last_context.push(event.clone())
            }
        }
    }

    fn idx_to_cxt(&mut self, idx: usize, invoc_count: usize) -> &mut Option<Vec<HostEvent>> {
        let current_context = self
            .replay
            .funcs
            .get_mut(&idx)
            .unwrap()
            .bodys
            .get_mut(invoc_count)
            .unwrap();
        current_context
    }
}
