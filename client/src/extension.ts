/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { workspace, ExtensionContext, languages, SemanticTokensLegend, Diagnostic, DiagnosticSeverity } from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';
import { MidlDocumentSemanticTokensProvider } from './MidlDocumentSemanticTokensProvider';
import { MidlParser } from './MidlParser';
import { ParseError } from './Model';
import { TokenType } from './TokenType';

let client: LanguageClient;

export const tokenTypes = new Map<TokenType, number>();
export const tokenModifiers = new Map<string, number>();

function enumKeys<O extends object, K extends keyof O = keyof O>(obj: O): K[] {
    return Object.keys(obj).filter(k => Number.isNaN(+k)) as K[];
}

function legend() {
	const tokenTypesLegend = enumKeys(TokenType).map(v => v as string);
	
	
	tokenTypesLegend.forEach((tokenType, index) => tokenTypes.set(TokenType[tokenType] , index));

	const tokenModifiersLegend = [
		'declaration', 'documentation', 'readonly', 'static', 'abstract', 'deprecated',
		'modification', 'async', 'defaultLibrary',
	];
	tokenModifiersLegend.forEach((tokenModifier, index) => tokenModifiers.set(tokenModifier, index));

	return new SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
}

export class Synchronizer {
  public msgId = -1;

  public WaitForMsgId(i: number) {
    let n = 0;
    while (this.msgId < i && n++ < 100) {
      setTimeout(() => {}, 50);
    }
  }
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

  console.log("MIDL3 LS - STARTING");

  const synchronizer = new Synchronizer();

  client.onReady().then(() => {
    client.onNotification('custom/parsedModel', (parsedModel: any) => {
      console.log(`Received parsed model: ${JSON.stringify(parsedModel)}`);
      synchronizer.msgId = parsedModel.id;
      const d = client.diagnostics.get(parsedModel.uri);
      const newErrors = [...d, ...(parsedModel.errors)];
      // update client state with parsed model
    });
  });

	context.subscriptions.push(languages.registerDocumentSemanticTokensProvider({ language: 'midl3'}, 
		new MidlDocumentSemanticTokensProvider(synchronizer), legend()));
	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
