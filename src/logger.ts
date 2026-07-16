import * as vscode from 'vscode'

let logChannel: vscode.OutputChannel | undefined

export function getLogChannel(): vscode.OutputChannel {
  if (!logChannel) {
    logChannel = vscode.window.createOutputChannel('massCode Assistant')
  }
  return logChannel
}

export function log(message: string, level: 'Info' | 'Error' = 'Info') {
  getLogChannel().appendLine(
    `[${level}] [${new Date().toISOString()}] ${message}`,
  )
}
