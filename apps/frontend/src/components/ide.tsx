import React, { useState, useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { python } from "@codemirror/lang-python";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { WsServerMessages, WsClientMessages } from "codeAgent/types/chat";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  Terminal,
  FileText,
  FileCode,
  FileImage,
  Settings,
} from "lucide-react";

// Tree node interface for file tree structure
interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  isOpen?: boolean;
}

// Custom theme that respects CSS variables
const customTheme = EditorView.theme({
  "&": {
    color: "hsl(var(--foreground))",
    backgroundColor: "hsl(var(--background))",
  },
  ".cm-content": {
    padding: "16px",
    caretColor: "hsl(var(--foreground))",
  },
  ".cm-focused": {
    outline: "none",
  },
  ".cm-editor": {
    fontSize: "14px",
  },
  ".cm-scroller": {
    color: "hsl(var(--foreground))",
    backgroundColor: "hsl(var(--background))",
  },
  ".cm-gutter": {
    backgroundColor: "hsl(var(--muted))",
    color: "hsl(var(--muted-foreground))",
    border: "none",
  },
  ".cm-gutters": {
    backgroundColor: "hsl(var(--muted))",
    color: "hsl(var(--muted-foreground))",
    border: "none",
  },
  ".cm-lineNumbers": {
    color: "hsl(var(--muted-foreground))",
  },
  ".cm-activeLine": {
    backgroundColor: "hsl(var(--accent))",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "hsl(var(--accent))",
  },
  ".cm-selectionBackground": {
    backgroundColor: "hsl(var(--primary) / 0.3)",
  },
  ".cm-focused .cm-selectionBackground": {
    backgroundColor: "hsl(var(--primary) / 0.3)",
  },
  ".cm-cursor": {
    borderLeftColor: "hsl(var(--foreground))",
  },
});

// Helper function to get language extension based on file extension
const getLanguageExtension = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
      return [javascript({ jsx: true, typescript: ext.includes("ts") })];
    case "html":
    case "htm":
      return [html()];
    case "css":
    case "scss":
    case "sass":
      return [css()];
    case "py":
      return [python()];
    case "json":
      return [json()];
    default:
      return [];
  }
};

// Helper function to build tree structure from flat file list
const buildFileTree = (
  files: { path: string; name: string; isDirectory: boolean }[]
): TreeNode[] => {
  const tree: TreeNode[] = [];
  const pathMap = new Map<string, TreeNode>();

  // Sort files to ensure directories come before their contents
  const sortedFiles = files.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.path.localeCompare(b.path);
  });

  sortedFiles.forEach((file) => {
    const parts = file.path.split("/").filter((part) => part.length > 0);
    const node: TreeNode = {
      name: file.name || parts[parts.length - 1] || file.path,
      path: file.path,
      isDirectory: file.isDirectory,
      children: file.isDirectory ? [] : undefined,
      isOpen: false,
    };

    pathMap.set(file.path, node);

    if (parts.length === 1) {
      // Root level file/directory
      tree.push(node);
    } else {
      // Find parent directory
      const parentPath = parts.slice(0, -1).join("/");
      const parent = pathMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        // Parent not found, add to root (fallback)
        tree.push(node);
      }
    }
  });

  return tree;
};

// Helper function to get file icon based on extension
const getFileIcon = (filename: string): React.ReactNode => {
  const ext = filename.split(".").pop()?.toLowerCase();
  const baseClasses = "w-4 h-4";

  switch (ext) {
    case "js":
    case "jsx":
      return <FileCode className={`${baseClasses} text-yellow-500`} />;
    case "ts":
    case "tsx":
      return <FileCode className={`${baseClasses} text-blue-500`} />;
    case "html":
    case "htm":
      return <FileCode className={`${baseClasses} text-orange-500`} />;
    case "css":
    case "scss":
    case "sass":
      return <FileCode className={`${baseClasses} text-blue-400`} />;
    case "py":
      return <FileCode className={`${baseClasses} text-green-500`} />;
    case "json":
      return <Settings className={`${baseClasses} text-yellow-600`} />;
    case "md":
      return <FileText className={`${baseClasses} text-gray-400`} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return <FileImage className={`${baseClasses} text-purple-500`} />;
    default:
      return <File className={`${baseClasses} text-muted-foreground`} />;
  }
};

// File tree component
const FileTreeNode: React.FC<{
  node: TreeNode;
  level: number;
  onFileClick: (path: string) => void;
  onToggleDirectory: (path: string) => void;
  currentFile: string | null;
}> = ({ node, level, onFileClick, onToggleDirectory, currentFile }) => {
  const indent = level * 16;

  return (
    <div>
      <div
        onClick={() =>
          node.isDirectory
            ? onToggleDirectory(node.path)
            : onFileClick(node.path)
        }
        className={`
          flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors rounded-sm mx-1
          ${currentFile === node.path ? "bg-primary text-primary-foreground" : "text-foreground"}
        `}
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        {node.isDirectory && (
          <span className="mr-1 text-muted-foreground">
            {node.isOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        )}
        <span className="mr-2">
          {node.isDirectory ? (
            node.isOpen ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500" />
            )
          ) : (
            getFileIcon(node.name)
          )}
        </span>
        <span className="truncate text-sm">{node.name}</span>
      </div>
      {node.isDirectory && node.isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
              onToggleDirectory={onToggleDirectory}
              currentFile={currentFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const DockerIDE = ({
  containerId,
  wsUrl = "ws://localhost:8080",
  userId,
}: {
  containerId: string;
  wsUrl: string;
  userId: number;
}) => {
  const [files, setFiles] = useState<
    { path: string; name: string; isDirectory: boolean }[]
  >([]);
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentFileContent, setCurrentFileContent] = useState<string>(
    "// Select a file to start editing"
  );
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(true);

  const terminalRef = useRef<HTMLDivElement>(null);
  const openFilesRef = useRef(new Map<string, string>()); // Track open file contents

  // Initialize WebSocket
  useEffect(() => {
    if (!containerId) return;

    console.log("attempting to connect to ws ", userId, containerId);
    const websocket = new WebSocket(
      `${wsUrl}/ws/${containerId}?userId=${userId}`
    );

    websocket.onopen = () => {
      console.log("Connected to Docker IDE WebSocket");
      setConnected(true);
      setError(null);
      // Auto-load files on connection
      setTimeout(() => {
        sendMessage({ type: "list_files" });
      }, 100);
    };

    websocket.onclose = () => {
      console.log("Disconnected from Docker IDE WebSocket");
      setConnected(false);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("WebSocket connection failed");
    };

    websocket.onmessage = (event) => {
      const message: WsServerMessages = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [containerId, wsUrl]);

  // Initialize Terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    terminalRef.current.innerHTML = `
      <div class="bg-background text-foreground p-4 font-mono text-sm h-full overflow-y-auto border-t border-border">
        <div class="text-muted-foreground">Terminal connected to container: ${containerId}</div>
        <div class="text-foreground">$ <span class="animate-pulse">_</span></div>
      </div>
    `;
  }, [containerId]);

  // Update file tree when files change
  useEffect(() => {
    const tree = buildFileTree(files);
    setFileTree(tree);
  }, [files]);

  const handleWebSocketMessage = (message: WsServerMessages) => {
    console.log("Received WebSocket message:", message);
    switch (message.type) {
      case "initial_files":
        console.log("initial_files", message.files);
        setFiles(message.files);
        break;
      case "file_content":
        // Store file content in cache using the path from the message
        console.log(
          "Received file content for:",
          message.path,
          "Content length:",
          message.content?.length
        );
        console.log("Current file:", currentFile);
        console.log(
          "Message path matches current file:",
          message.path === currentFile
        );

        if (message.path && message.content !== undefined) {
          openFilesRef.current.set(message.path, message.content);
          console.log("Stored content in cache for:", message.path);

          // Only update the editor if this is the currently selected file
          if (currentFile === message.path) {
            console.log("Updating editor content for:", message.path);
            setCurrentFileContent(message.content);
          } else {
            console.log(
              "Not updating editor - current file is:",
              currentFile,
              "but received content for:",
              message.path
            );
          }
        } else {
          console.error("Invalid file content message:", message);
        }
        break;
      case "file_changed":
        // Real-time file updates from the file watcher
        if (message.path && message.content !== undefined) {
          openFilesRef.current.set(message.path, message.content);

          // If this file is currently open, update the editor
          if (currentFile === message.path) {
            setCurrentFileContent(message.content);
          }
        }
        break;
      case "file_written":
        // Confirmation that file was written successfully
        console.log(`File written successfully: ${message.path}`);
        break;
      case "error":
        console.error("WebSocket error:", message.message);
        setError(message.message);
        break;
      default:
        console.log("Unknown message type:", message);
    }
  };

  const sendMessage = (message: WsClientMessages) => {
    console.log("Sending WebSocket message:", message);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket not ready, state:", ws?.readyState);
    }
  };

  const openFile = (filePath: string) => {
    console.log("Opening file:", filePath);
    setCurrentFile(filePath);

    // Check if file is already loaded
    const cachedContent = openFilesRef.current.get(filePath);
    if (cachedContent) {
      console.log("Using cached content for:", filePath);
      setCurrentFileContent(cachedContent);
    } else {
      console.log("Requesting file content from server for:", filePath);
      // Request file content from server, but don't change the editor content yet
      sendMessage({
        type: "read_file",
        path: filePath,
      });
      // Keep the previous content while loading (or show empty if no previous content)
      // Don't show "Loading..." to avoid the jarring experience
    }
  };

  const toggleDirectory = (path: string) => {
    setFileTree((prevTree) => {
      const toggleNode = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.map((node) => {
          if (node.path === path && node.isDirectory) {
            return { ...node, isOpen: !node.isOpen };
          }
          if (node.children) {
            return { ...node, children: toggleNode(node.children) };
          }
          return node;
        });
      };
      return toggleNode(prevTree);
    });
  };

  const saveFile = (filePath: string, content: string) => {
    // Update cached content
    openFilesRef.current.set(filePath, content);

    // Send to server
    sendMessage({
      type: "write_file",
      path: filePath,
      content: content,
    });
  };

  const handleCodeChange = (value: string) => {
    setCurrentFileContent(value);

    // Auto-save after a short delay (debounced)
    if (currentFile) {
      const timeoutId = setTimeout(() => {
        saveFile(currentFile, value);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border">
        <h1 className="text-lg font-semibold">Docker IDE</h1>
        <div className="flex items-center space-x-4">
          <div
            className={`flex items-center space-x-2 ${connected ? "text-green-500" : "text-destructive"}`}
          >
            <div
              className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-destructive"}`}
            ></div>
            <span className="text-sm">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className="flex items-center space-x-2 px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm hover:bg-secondary/80 transition-colors"
          >
            <Terminal className="w-4 h-4" />
            <span>{showTerminal ? "Hide Terminal" : "Show Terminal"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive text-destructive-foreground p-3 text-sm">
          Error: {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer */}
        <div className="w-64 bg-sidebar border-r border-sidebar-border overflow-y-auto">
          <div className="p-3 border-b border-sidebar-border">
            <h2 className="text-sm font-semibold text-sidebar-foreground flex items-center">
              <Folder className="w-4 h-4 mr-2 text-blue-500" />
              EXPLORER
            </h2>
          </div>
          <div className="py-2">
            {fileTree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                level={0}
                onFileClick={openFile}
                onToggleDirectory={toggleDirectory}
                currentFile={currentFile}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Current File Tab */}
          {currentFile && (
            <div className="bg-card border-b border-border px-4 py-2 flex items-center">
              <span className="mr-2">{getFileIcon(currentFile)}</span>
              <span className="text-sm text-card-foreground">
                {currentFile.split("/").pop()}
              </span>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <CodeMirror
              value={currentFileContent}
              height="100%"
              theme={customTheme}
              extensions={
                currentFile ? getLanguageExtension(currentFile) : [javascript()]
              }
              onChange={handleCodeChange}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                highlightSelectionMatches: false,
              }}
            />
          </div>

          {/* Terminal */}
          {showTerminal && (
            <div className="h-64 border-t border-border">
              <div ref={terminalRef} className="h-full bg-background" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DockerIDE;
