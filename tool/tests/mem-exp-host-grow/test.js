import fs from 'fs'
import path from 'path'
const wasmBinary = fs.readFileSync(path.join(import.meta.dir, 'index.wasm'))

let instance
let imports = {
    env: {
        changeMem: () => {
            instance.exports.memory.grow(1)
            let changeAddr = instance.exports.memory.buffer.byteLength - 4
            new Uint8Array(instance.exports.memory.buffer)[changeAddr] = 60000
            return changeAddr
        }
    }
}
let wasm = await WebAssembly.instantiate(wasmBinary, imports)
instance = wasm.instance
instance.exports.main()