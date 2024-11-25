import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

async function copyFile(uri: vscode.Uri) {
  let data = await vscode.workspace.fs.readFile(uri);
  let content = new TextDecoder("utf-8").decode(data);

  let filePath = vscode.workspace.asRelativePath(uri);
  let projectName = vscode.workspace.name || "Unknown";
  let fileExtension = path.extname(uri.fsPath).slice(1);

  return `
===============================
Project Name: '${projectName}'
File Path: '${filePath}'
File Content:
\`\`\`${fileExtension}
${content}
\`\`\`
===============================
`;
}

async function readDirectoryRecursive(
  uri: vscode.Uri,
  ignorePatterns: string[]
): Promise<vscode.Uri[]> {
  let files = await vscode.workspace.fs.readDirectory(uri);
  let fileUris: vscode.Uri[] = [];

  for (let [fileName, fileType] of files) {
    let fileUri = vscode.Uri.joinPath(uri, fileName);

    // Check if the file matches any ignore pattern
    if (ignorePatterns.some(pattern => fileName.includes(pattern))) {
      continue;
    }

    if (fileType === vscode.FileType.Directory) {
      let subDirectoryFiles = await readDirectoryRecursive(fileUri, ignorePatterns);
      fileUris.push(...subDirectoryFiles);
    } else if (fileType === vscode.FileType.File) {
      fileUris.push(fileUri);
    }
  }

  return fileUris;
}

async function copyDirectory(uri: vscode.Uri) {
  const ignorePatterns: string[] =
    vscode.workspace.getConfiguration("copyToGptChat").get("ignore") || [];

  let directoryPath = vscode.workspace.asRelativePath(uri);
  let projectName = vscode.workspace.name || "Unknown";

  let toCopy = `
===============================
Project Name: '${projectName}'
Directory Path: '${directoryPath}'
===============================
`;

  let fileUris = await readDirectoryRecursive(uri, ignorePatterns);
  for (let fileUri of fileUris) {
    toCopy += await copyFile(fileUri);
  }

  return toCopy;
}

export function activate(context: vscode.ExtensionContext) {
  let disposableFile = vscode.commands.registerCommand(
    "extension.copyToGptChat",
    async (uri: vscode.Uri) => {
      let toCopy = await copyFile(uri);
      await vscode.env.clipboard.writeText(toCopy);
    }
  );

  let disposableDirectory = vscode.commands.registerCommand(
    "extension.copyDirectoryToGptChat",
    async (uri: vscode.Uri) => {
      let toCopy = await copyDirectory(uri);
      await vscode.env.clipboard.writeText(toCopy);
    }
  );

  let disposablePrompt = vscode.commands.registerCommand(
    "extension.promptToGptChat",
    async () => {
      try {
        console.log("Comando Iniciado!"); // For debugging purposes
        let filePath = path.resolve(
          __dirname,
          "./prompt/promptCopyToGptChat.md"
        );
        console.log("Path do arquivo: ", filePath);
        let fileBuffer = await fs.promises.readFile(filePath);
        let toCopy = new TextDecoder("utf-8").decode(fileBuffer);
        console.log("Content to be copied:", toCopy); // For debugging purposes
        await vscode.env.clipboard.writeText(toCopy);
      } catch (error) {
        console.error("An error occurred:", error);
      }
    }
  );

  context.subscriptions.push(
    disposableFile,
    disposableDirectory,
    disposablePrompt
  );
}

export function deactivate() { }
