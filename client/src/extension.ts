/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext, languages, SemanticTokensLegend } from 'vscode';

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

import * as vscode from 'vscode';
import { MidlDocumentSemanticTokensProvider } from './MidlDocumentSemanticTokensProvider';
import { TokenTypes } from './TokenType';

import * as appInsights from 'applicationinsights';
import * as fs from 'fs';

appInsights.setup('ae0256bc-e5d8-474a-a1fa-a7ffee86a877').start();
appInsights.defaultClient.config.disableAppInsights = process.env['DISABLE_MIDL3_TELEMETRY'] === 'true'

const packageJson = require('../../package.json');

let client: LanguageClient;

export const tokenModifiers = new Map<string, number>();

function legend() {

  const tokenModifiersLegend = [
    'declaration', 'documentation', 'readonly', 'static', 'abstract', 'deprecated',
    'modification', 'async', 'defaultLibrary',
  ];
  tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

  return new SemanticTokensLegend(TokenTypes, tokenModifiersLegend);
}

export function activate(context: ExtensionContext) {

  console.log("MIDL3 LS - ACTIVATE");

  // The server is implemented in node
  let serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  let debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  let serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  // Options to control the language client
  let clientOptions: LanguageClientOptions = {
    // Register the server for IDL files
    documentSelector: [{ scheme: 'file', language: 'midl3' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
    }
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    'midl3',
    'MIDL',
    serverOptions,
    clientOptions
  );

  console.log(`MIDL3 LS - STARTING: version = ${packageJson.version}`);
  context.subscriptions.push(languages.registerDocumentSemanticTokensProvider({ language: 'midl3' },
    new MidlDocumentSemanticTokensProvider(client), legend()));
  // Start the client. This will also launch the server
  client.start();
  appInsights.defaultClient.trackEvent({
    name: 'StartClient',
    properties: {
      version: packageJson.version,
    },
  });
  client.onReady().then(() => {
    client.onNotification('createdDefinition', (p: { text: string, file: string, action: string }) => {
      vscode.env.clipboard.writeText(p.text);

      const commands = fs.existsSync(p.file) ? [p.action] : []; 
      vscode.window.showInformationMessage('Copied to clipboard 📋', ...commands).then(async (s) => {
        if (s) {
          const doc = await vscode.workspace.openTextDocument(p.file);
          await vscode.window.showTextDocument(doc);
        }
      });
    });
  })
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
