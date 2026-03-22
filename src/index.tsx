#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import { ProjectSelect } from './screens/ProjectSelect.js'
import path from 'path'

const args = process.argv.slice(2)
const pathIdx = args.indexOf('--path')
const baseCwd = process.env.INIT_CWD ?? process.cwd()
const taskopsRoot = pathIdx !== -1 ? path.resolve(baseCwd, args[pathIdx + 1]) : null

// Enter alternate screen buffer so the app fills the full terminal window
// and previous shell output is hidden (restored on exit).
process.stdout.write('\x1b[?1049h\x1b[H')

const restoreScreen = () => process.stdout.write('\x1b[?1049l')
process.on('exit', restoreScreen)
process.on('SIGINT', () => { restoreScreen(); process.exit(0) })
process.on('SIGTERM', () => { restoreScreen(); process.exit(0) })

render(<ProjectSelect taskopsRoot={taskopsRoot} />)
