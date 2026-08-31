import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

const currentFile = fileURLToPath(import.meta.url)
const currentDir = path.dirname(currentFile)
const workspaceEnvPath = path.resolve(currentDir, '../../../../.env')
const localEnvPath = path.resolve(process.cwd(), '.env')

for (const envPath of [localEnvPath, workspaceEnvPath]) {
  if (!fs.existsSync(envPath)) continue
  dotenv.config({ path: envPath })
  break
}
