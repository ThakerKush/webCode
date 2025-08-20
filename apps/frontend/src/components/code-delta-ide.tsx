"use client";

import React, { useState, useEffect, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { python } from "@codemirror/lang-python";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { useDataStream } from "./data-stream-provider";
import { useSession } from "@/lib/auth-client";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  FileImage,
  Settings,
  RefreshCw,
} from "lucide-react";

// Tree node interface for file tree structure
interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  isOpen?: boolean;
}

interface WorkspaceFile {
  path: string;
  name: string;
  isDirectory: boolean;
}

// WebSocket message types (matching backend)
interface WsClientMessages {
  type: "list_files" | "read_file" | "write_file";
  path?: string;
  content?: string;
}

interface WsServerMessages {
  type:
    | "initial_files"
    | "file_content"
    | "file_changed"
    | "file_written"
    | "error";
  files?: WorkspaceFile[];
  path?: string;
  content?: string;
  message?: string;
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

// Helper function to build tree structure from files
const buildFileTree = (
  filesMap: Record<string, string>,
  workspaceFiles: WorkspaceFile[] = []
): TreeNode[] => {
  const tree: TreeNode[] = [];
  const pathMap = new Map<string, TreeNode>();

  // Combine code delta files with workspace files (avoid duplicates)
  const allPaths = new Set([
    ...Object.keys(filesMap),
    ...workspaceFiles.map((f) => f.path),
  ]);
  const dirPaths = new Set<string>();

  // Add directory paths from workspace files
  workspaceFiles.forEach((file) => {
    if (file.isDirectory) {
      dirPaths.add(file.path);
    }
  });

  // Add implicit directory paths from file paths
  allPaths.forEach((filePath) => {
    const parts = filePath.split("/").filter((part) => part.length > 0);
    for (let i = 1; i < parts.length; i++) {
      const dirPath = parts.slice(0, i).join("/");
      dirPaths.add(dirPath);
    }
  });

  // Sort all paths to ensure proper hierarchy
  const sortedPaths = Array.from(allPaths).sort();

  // Process each unique path only once
  sortedPaths.forEach((path) => {
    const parts = path.split("/").filter((part) => part.length > 0);
    const isDirectory =
      dirPaths.has(path) ||
      workspaceFiles.some((f) => f.path === path && f.isDirectory);
    const name = parts[parts.length - 1] || path;

    const node: TreeNode = {
      name,
      path,
      isDirectory,
      children: isDirectory ? [] : undefined,
      isOpen: true,
    };

    pathMap.set(path, node);

    if (parts.length === 1) {
      tree.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = pathMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
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
    case "ts":
    case "tsx":
      return <FileCode className={`${baseClasses} text-muted-foreground`} />;
    case "html":
    case "htm":
      return <FileCode className={`${baseClasses} text-muted-foreground`} />;
    case "css":
    case "scss":
    case "sass":
      return <FileCode className={`${baseClasses} text-muted-foreground`} />;
    case "py":
      return <FileCode className={`${baseClasses} text-muted-foreground`} />;
    case "json":
      return <Settings className={`${baseClasses} text-muted-foreground`} />;
    case "md":
      return <FileText className={`${baseClasses} text-muted-foreground`} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return <FileImage className={`${baseClasses} text-muted-foreground`} />;
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

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (node.isDirectory) {
      onToggleDirectory(node.path);
    } else {
      onFileClick(node.path);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onMouseDown={(e) => e.preventDefault()}
        className={`
          flex items-center py-1 px-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors rounded-sm mx-1 select-none
          ${currentFile === node.path ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"}
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
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Folder className="w-4 h-4 text-muted-foreground" />
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

// Resizable panel component
const ResizablePanel: React.FC<{
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  children: React.ReactNode;
}> = ({ defaultWidth, minWidth, maxWidth, children }) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(defaultWidth);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, startWidthRef.current + deltaX)
      );
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  return (
    <div className="flex h-full">
      <div
        style={{ width: `${width}px` }}
        className="bg-background border-r border-border flex-shrink-0"
      >
        {children}
      </div>
      <div
        className="w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

export const CodeDeltaIDE = ({
  chatId,
  containerId,
  wsUrl,
}: {
  chatId: string;
  containerId: string;
  wsUrl: string;
}) => {
  const { dataStream } = useDataStream();
  const { data: session } = useSession();
  const [files, setFiles] = useState<Record<string, string>>({});
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [fileTree, setFileTree] = useState<TreeNode[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [currentFileContent, setCurrentFileContent] = useState<string>(
    "// Select a file to view its contents"
  );
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize WebSocket connection using existing backend endpoint
  useEffect(() => {
    const initializeWorkspace = async () => {
      if (!containerId || !session?.user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const wsUrll = `${wsUrl}/${chatId}?userId=${session.user.id}`;
        console.log("wsUrll", wsUrll);
        // Connect to existing WebSocket endpoint using chatId (not containerId)
        const websocket = new WebSocket(wsUrll);

        websocket.onopen = () => {
          console.log("Connected to IDE WebSocket for chat:", containerId);
          setConnected(true);
          setError(null);
          setIsLoading(false);
          // Request initial files
          setTimeout(() => {
            websocket.send(JSON.stringify({ type: "list_files" }));
          }, 100);
        };

        websocket.onclose = () => {
          console.log("Disconnected from IDE WebSocket");
          setConnected(false);
        };

        websocket.onerror = (error) => {
          console.error("WebSocket error:", error);
          setError("Failed to connect to workspace");
          setIsLoading(false);
        };

        websocket.onmessage = (event) => {
          const message: WsServerMessages = JSON.parse(event.data);
          handleWebSocketMessage(message);
        };

        setWs(websocket);

        return () => {
          websocket.close();
        };
      } catch (error) {
        console.error("Failed to initialize workspace:", error);
        setError("Failed to connect to workspace");
        setIsLoading(false);
      }
    };

    initializeWorkspace();
  }, [containerId, session?.user?.id]);

  // Handle WebSocket messages
  const handleWebSocketMessage = (message: WsServerMessages) => {
    console.log("IDE WebSocket message:", message);

    switch (message.type) {
      case "initial_files":
        if (message.files) {
          console.log("Received initial files:", message.files);
          setWorkspaceFiles(message.files);
        }
        break;
      case "file_content":
        if (message.path && message.content !== undefined) {
          console.log("Received file content for:", message.path);
          setFiles((prev) => ({ ...prev, [message.path!]: message.content! }));

          // Update editor if this is the current file
          if (currentFile === message.path) {
            setCurrentFileContent(message.content);
          }
        }
        break;
      case "file_changed":
        // Real-time file updates
        if (message.path && message.content !== undefined) {
          setFiles((prev) => ({ ...prev, [message.path!]: message.content! }));

          if (currentFile === message.path) {
            setCurrentFileContent(message.content);
          }
        }
        break;
      case "error":
        console.error("WebSocket error:", message.message);
        setError(message.message || "Unknown error");
        break;
    }
  };

  // Send WebSocket message
  const sendMessage = (message: WsClientMessages) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.error("WebSocket not ready, state:", ws?.readyState);
    }
  };

  // Process code deltas from the data stream
  useEffect(() => {
    dataStream.forEach((dataPart) => {
      if (dataPart.type === "data-codeDelta" && dataPart.data) {
        const { path, content } = dataPart.data as {
          path: string;
          content: string;
        };

        setFiles((prev) => {
          const updated = { ...prev, [path]: content };

          // If this is the currently open file, update the editor content
          if (currentFile === path) {
            setCurrentFileContent(content);
          }

          // If no file is currently open, open this one
          if (!currentFile) {
            setCurrentFile(path);
            setCurrentFileContent(content);
          }

          return updated;
        });
      }
    });
  }, [dataStream, currentFile]);

  // Update file tree when files change
  useEffect(() => {
    const tree = buildFileTree(files, workspaceFiles);
    setFileTree(tree);
  }, [files, workspaceFiles]);

  const openFile = (filePath: string) => {
    setCurrentFile(filePath);

    // Check if we have content from code deltas first
    if (files[filePath]) {
      setCurrentFileContent(files[filePath]);
    } else {
      // Request content from WebSocket
      setCurrentFileContent("// Loading...");
      sendMessage({ type: "read_file", path: filePath });
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

  const refreshFiles = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendMessage({ type: "list_files" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground p-8">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
          <p className="text-sm">Connecting to workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground p-8">
          <FileCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Connection Error</h3>
          <p className="text-sm mb-4">{error}</p>
          <button
            onClick={refreshFiles}
            className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (Object.keys(files).length === 0 && workspaceFiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground p-8">
          <FileCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">IDE Ready</h3>
          <p className="text-sm">
            Files will appear here when the agent writes code
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border flex-shrink-0">
        <h2 className="text-sm font-semibold text-foreground flex items-center">
          <FileCode className="w-4 h-4 mr-2" />
          Code Editor
          {connected && (
            <div className="ml-2 w-2 h-2 bg-green-500 rounded-full"></div>
          )}
        </h2>
        <button
          onClick={refreshFiles}
          className="p-1 hover:bg-muted rounded"
          title="Refresh files"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* File Explorer - fixed width */}
        <div
          className="flex-shrink-0 bg-sidebar border-r border-sidebar-border overflow-y-auto"
          style={{ width: "200px" }}
        >
          <div className="p-3 border-b border-sidebar-border">
            <h3 className="text-xs font-semibold text-sidebar-foreground flex items-center">
              <Folder className="w-3 h-3 mr-2" />
              FILES
            </h3>
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

        {/* Editor - takes remaining space */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Current File Tab */}
          {currentFile && (
            <div className="bg-card border-b border-border px-4 py-2 flex items-center flex-shrink-0">
              <span className="mr-2">{getFileIcon(currentFile)}</span>
              <span className="text-sm text-card-foreground truncate">
                {currentFile.split("/").pop()}
              </span>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 overflow-hidden min-h-0">
            <CodeMirror
              value={currentFileContent}
              height="100%"
              theme={customTheme}
              extensions={
                currentFile ? getLanguageExtension(currentFile) : [javascript()]
              }
              editable={false}
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: false,
                bracketMatching: true,
                closeBrackets: false,
                autocompletion: false,
                highlightSelectionMatches: false,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export { ResizablePanel };
export default CodeDeltaIDE;
