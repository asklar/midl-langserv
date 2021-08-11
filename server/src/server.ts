/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
  DocumentUri,
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import * as fs from 'fs';
import * as path from 'path';
import { IParsedToken } from './Model';

import * as pegjs from 'pegjs';

import * as appInsights from 'applicationinsights';
appInsights.setup('ae0256bc-e5d8-474a-a1fa-a7ffee86a877').start();

const packageJson = require('../../package.json');

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}

  connection.onRequest('parse', (params: {uri: DocumentUri, text: string }) => {
    const parseResult = parseText(params.uri, params.text);
    return parseResult.tokens;
  })
});

const cwd = __dirname;
const grammarFilePath = fs.realpathSync(path.join(__dirname, 'midl.pegjs'));
const grammarFile = fs.readFileSync(grammarFilePath).toString();

let tokens: IParsedToken[] = [];

const grammar = pegjs.generate(grammarFile);



function parseText(uri: DocumentUri, text: string) : { tokens: IParsedToken[], errors: Diagnostic[] } {
  try {
    const parsed = (grammar.parse(text, {tokenList: tokens}) as any[]).filter(x => x !== undefined);
    const t = tokens;
    console.log(JSON.stringify(t, null, 2));
    return {tokens: t, errors: []};
  } catch (_e) {
    console.log('Error from LSP Server:');
    const e = _e as pegjs.PEG.SyntaxError;
    console.log(JSON.stringify(e, null, 2));
    const errors = [
      {
        message: e.message,
        severity: DiagnosticSeverity.Error,
        source: 'MIDL 3',
        range: {
          start: {
            line: e.location.start.line - 1,
            character: e.location.start.column - 1,
          },
          end: {
            line: e.location.end.line - 1,
            character: e.location.end.column - 1,
          },
        }
      }
    ];
    return { tokens: [], errors: errors};
  } finally {
    tokens = [];
  }
}

// The example settings
interface MidlLSSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: MidlLSSettings = { maxNumberOfProblems: 1000 };
let globalSettings: MidlLSSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<MidlLSSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <MidlLSSettings>(
			(change.settings.midl3 || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<MidlLSSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'midl3'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

const classicToMidl3Map: Record<string, string> = {
  int: 'Int32',
  short: 'Int16',
  long: 'Int32',
  PWSTR: 'String',
  PCWSTR: 'String',
  double: 'Double',
  float: 'Single',
  string: 'String',
};

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	let settings = await getDocumentSettings(textDocument.uri);
	let m: RegExpExecArray | null;

  const classicTypes = new RegExp(`\\b(${Object.keys(classicToMidl3Map).join('|')})\\b`, 'g');

  const parseResult = parseText(textDocument.uri, textDocument.getText());

  let problems = 0;
  for (const t of parseResult.tokens.filter(x => x.tokenType === 'type')) {
    const text = t.text;
    if (text) {
      while ((m = classicTypes.exec(text)) && problems < settings.maxNumberOfProblems) {
        problems++;
        const classicType = m[0];
        const insteadUse = classicToMidl3Map[classicType];
        let diagnostic: Diagnostic = {
          severity: DiagnosticSeverity.Error,
          range: {
            start: textDocument.positionAt(t.startIndex),
            end: textDocument.positionAt(t.startIndex + m[0].length)
          },
          message: `${classicType} is a classic MIDL type, not a MIDL 3 type. Use ${insteadUse} instead.`,
          source: 'ex'
        };
        if (hasDiagnosticRelatedInformationCapability) {
          diagnostic.relatedInformation = [
            {
              location: {
                uri: textDocument.uri,
                range: Object.assign({}, diagnostic.range)
              },
              message: 'Do not mix MIDL and MIDL 3 syntax'
            },
          ];
        }
        parseResult.errors.push(diagnostic);
      }
    }
  
  }
  	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: parseResult.errors });

}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

function addCompletionItems(
	a: CompletionItem[], 
	items: string[], 
	kind: CompletionItemKind): void {
	const nextItem = a.length;
	for (let i = 0; i < items.length; i++) {
		const ci: CompletionItem = {
			label: items[i],
			kind: kind,
			data: nextItem + i,
		};
		a.push(ci);
	}
}

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.

		const types = [
			'Int16',
			'Int32',
			'Int64',
			'UInt8',
			'UInt16',
			'UInt32',
			'UInt64',
			'Char',
			'String',
			'Single',
			'Double',
			'Boolean',
			'Guid',
			'void',
		];

		const keywords = [
			'runtimeclass',
			'interface',
			'struct',
			'enum',
			'event',
			'delegate',
			'requires',
			'attribute',
			'get',
			'set',
			'import',
			'unsealed',
			'static',
			'partial',
			'out',
			'ref',
			'ref const',
      'namespace'
		];

		const attrs = [
			'default_interface',
			'default',
			'interface_name',
			'allowforweb',
			'constructor_name',
			'contract',
			'static_name',
			'attributeusage',
			//
			'target_runtimeclass',
			'target_interface',
			'target_method',
			'target_property',
			'target_event',
		];


		const items: CompletionItem[] = [];
		addCompletionItems(items, keywords, CompletionItemKind.Keyword);
		addCompletionItems(items, types, CompletionItemKind.Class);
		addCompletionItems(items, attrs, CompletionItemKind.Property);

		return items;
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'A WinRT runtime class';
			item.documentation = 'Documentation goes here';
		} else if (item.data === 2) {
			item.detail = 'A WinRT interface';
			item.documentation = 'docs';
		}
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

appInsights.defaultClient.trackEvent({
  name: 'StartServer',
  properties: {
    version: packageJson.version,
  },
});

