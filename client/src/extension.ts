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
	TransportKind
} from 'vscode-languageclient/node';
import { MidlDocumentSemanticTokensProvider } from './MidlDocumentSemanticTokensProvider';

let client: LanguageClient;

export enum TokenType {
	comment, string, keyword, number, regexp, operator, namespace,
	type, struct, class, interface, enum, typeParameter, function,
	method, macro, variable, parameter, property, label,
	preProcessor,
	attribute,
	identifier,
	scopeToken,
	semicolon,
	colon,
	comma
}


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

export function activate(context: ExtensionContext) {
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
		// Register the server for plain text documents
		documentSelector: [{ scheme: 'file', language: 'midl3' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'languageServerExample',
		'Language Server Example',
		serverOptions,
		clientOptions
	);

	context.subscriptions.push(languages.registerDocumentSemanticTokensProvider({ language: 'midl3'}, 
		new MidlDocumentSemanticTokensProvider(), legend()));
	// Start the client. This will also launch the server
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
