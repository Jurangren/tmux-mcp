#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";
import * as tmux from "./tmux.js";

// Create MCP server
const server = new McpServer({
  name: "tmux-mcp",
  version: "0.2.2"
}, {
  capabilities: {
    resources: {
      subscribe: true,
      listChanged: true
    },
    tools: {
      listChanged: true
    },
    logging: {
      setLevel: async () => {
        // TODO: Implement logging setLevel
      },
    }
  }
});

// // List all tmux sessions - Tool
// server.tool(
//   "list-sessions",
//   "List all active tmux sessions",
//   {},
//   async () => {
//     try {
//       const sessions = await tmux.listSessions();
//       return {
//         content: [{
//           type: "text",
//           text: JSON.stringify(sessions, null, 2)
//         }]
//       };
//     } catch (error) {
//       return {
//         content: [{
//           type: "text",
//           text: `Error listing tmux sessions: ${error}`
//         }],
//         isError: true
//       };
//     }
//   }
// );

// // Find session by name - Tool
// server.tool(
//   "find-session",
//   "Find a tmux session by name",
//   {
//     name: z.string().describe("Name of the tmux session to find")
//   },
//   async ({ name }) => {
//     try {
//       const session = await tmux.findSessionByName(name);
//       return {
//         content: [{
//           type: "text",
//           text: session ? JSON.stringify(session, null, 2) : `Session not found: ${name}`
//         }]
//       };
//     } catch (error) {
//       return {
//         content: [{
//           type: "text",
//           text: `Error finding tmux session: ${error}`
//         }],
//         isError: true
//       };
//     }
//   }
// );

// // List windows in a session - Tool
// server.tool(
//   "list-windows",
//   "List windows in a tmux session",
//   {
//     sessionId: z.string().describe("ID of the tmux session")
//   },
//   async ({ sessionId }) => {
//     try {
//       const windows = await tmux.listWindows(sessionId);
//       return {
//         content: [{
//           type: "text",
//           text: JSON.stringify(windows, null, 2)
//         }]
//       };
//     } catch (error) {
//       return {
//         content: [{
//           type: "text",
//           text: `Error listing windows: ${error}`
//         }],
//         isError: true
//       };
//     }
//   }
// );

// // List panes in a window - Tool
// server.tool(
//   "list-panes",
//   "List panes in a tmux window",
//   {
//     windowId: z.string().describe("ID of the tmux window")
//   },
//   async ({ windowId }) => {
//     try {
//       const panes = await tmux.listPanes(windowId);
//       return {
//         content: [{
//           type: "text",
//           text: JSON.stringify(panes, null, 2)
//         }]
//       };
//     } catch (error) {
//       return {
//         content: [{
//           type: "text",
//           text: `Error listing panes: ${error}`
//         }],
//         isError: true
//       };
//     }
//   }
// );

// Capture pane content - Tool
server.tool(
  "capture-pane",
  "Capture content from a tmux pane. By default, it captures the last 100 lines. Use 'lines: 0' to capture all content. If startLine and endLine are provided, 'lines' is ignored.",
  {
    paneId: z.string().describe("ID of the tmux pane"),
    colors: z.boolean().optional().describe("Include color/escape sequences for text and background attributes in output"),
    startLine: z.number().int().optional().describe("Start line for capture (negative values count from the end). Requires endLine."),
    endLine: z.number().int().optional().describe("End line for capture (negative values count from the end). Requires startLine."),
    lines: z.number().int().optional().describe("Number of recent lines to capture. Use 0 for all lines. Defaults to 100."),
  },
  async (args) => {
    const { paneId, colors, startLine, endLine, lines } = args;
    const includeColors = colors || false;

    // Validate arguments
    if ((startLine !== undefined && endLine === undefined) || (startLine === undefined && endLine !== undefined)) {
        return {
            content: [{
                type: "text",
                text: "Error: Both startLine and endLine must be provided for line-based capture."
            }],
            isError: true
        };
    }

    try {
      let result: tmux.CapturePaneResult;

      if (startLine !== undefined && endLine !== undefined) {
        result = await tmux.capturePaneContentByLines(paneId, startLine, endLine, includeColors);
      } else {
        result = await tmux.capturePaneContent(paneId, lines, includeColors);
      }

      const responseText = `Captured lines ${result.startLine}-${result.endLine} of ${result.totalLines}:\n\n${result.content}`;

      return {
        content: [{
          type: "text",
          text: result.content ? responseText : "No content captured"
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error capturing pane content: ${error}`
        }],
        isError: true
      };
    }
  }
);

// // Create new session - Tool
// server.tool(
//   "create-session",
//   "Create a new tmux session",
//   {
//     name: z.string().describe("Name for the new tmux session")
//   },
//   async ({ name }) => {
//     try {
//       const session = await tmux.createSession(name);
//       return {
//         content: [{
//           type: "text",
//           text: session
//             ? `Session created: ${JSON.stringify(session, null, 2)}`
//             : `Failed to create session: ${name}`
//         }]
//       };
//     } catch (error) {
//       return {
//         content: [{
//           type: "text",
//           text: `Error creating session: ${error}`
//         }],
//         isError: true
//       };
//     }
//   }
// );

// // Create new window - Tool
// server.tool(
//   "create-window",
//   "Create a new window in a tmux session",
//   {
//     sessionId: z.string().describe("ID of the tmux session"),
//     name: z.string().describe("Name for the new window")
//   },
//   async ({ sessionId, name }) => {
//     try {
//       const window = await tmux.createWindow(sessionId, name);
//       return {
//         content: [{
//           type: "text",
//           text: window
//             ? `Window created: ${JSON.stringify(window, null, 2)}`
//             : `Failed to create window: ${name}`
//         }]
//       };
//     } catch (error) {
//       return {
//         content: [{
//           type: "text",
//           text: `Error creating window: ${error}`
//         }],
//         isError: true
//       };
//     }
//   }
// );

// // Kill session - Tool
// server.tool(
//   "kill-session",
//   "Kill a tmux session by ID",
//   {
//     sessionId: z.string().describe("ID of the tmux session to kill")
//   },
//   async ({ sessionId }) => {
//     try {
//       await tmux.killSession(sessionId);
//       return {
//         content: [{
//           type: "text",
//           text: `Session ${sessionId} has been killed`
//         }]
//       };
//     } catch (error) {
//       return {
//         content: [{
//           type: "text",
//           text: `Error killing session: ${error}`
//         }],
//         isError: true
//       };
//     }
//   }
// );

// // Kill window - Tool
// server.tool(
//   "kill-window",
//   "Kill a tmux window by ID",
//   {
//     windowId: z.string().describe("ID of the tmux window to kill")
//   },
//   async ({ windowId }) => {
//     try {
//       await tmux.killWindow(windowId);
//       return {
//         content: [{
//           type: "text",
//           text: `Window ${windowId} has been killed`
//         }]
//       };
//     } catch (error) {
//       return {
//         content: [{
//           type: "text",
//           text: `Error killing window: ${error}`
//         }],
//         isError: true
//       };
//     }
//   }
// );

// // Kill pane - Tool
// server.tool(
//   "kill-pane",
//   "Kill a tmux pane by ID",
//   {
//     paneId: z.string().describe("ID of the tmux pane to kill")
//   },
//   async ({ paneId }) => {
//     try {
//       await tmux.killPane(paneId);
//       return {
//         content: [{
//           type: "text",
//           text: `Pane ${paneId} has been killed`
//         }]
//       };
//     } catch (error) {
//       return {
//         content: [{
//           type: "text",
//           text: `Error killing pane: ${error}`
//         }],
//         isError: true
//       };
//     }
//   }
// );

// // Split pane - Tool
// server.tool(
//   "split-pane",
//   "Split a tmux pane horizontally or vertically",
//   {
//     paneId: z.string().describe("ID of the tmux pane to split"),
//     direction: z.enum(["horizontal", "vertical"]).optional().describe("Split direction: 'horizontal' (side by side) or 'vertical' (top/bottom). Default is 'vertical'"),
//     size: z.number().min(1).max(99).optional().describe("Size of the new pane as percentage (1-99). Default is 50%")
//   },
//   async ({ paneId, direction, size }) => {
//     try {
//       const newPane = await tmux.splitPane(paneId, direction || 'vertical', size);
//       return {
//         content: [{
//           type: "text",
//           text: newPane
//             ? `Pane split successfully. New pane: ${JSON.stringify(newPane, null, 2)}`
//             : `Failed to split pane ${paneId}`
//         }]
//       };
//     } catch (error) {
//       return {
//         content: [{
//           type: "text",
//           text: `Error splitting pane: ${error}`
//         }],
//         isError: true
//       };
//     }
//   }
// );

// Execute command in pane - Tool
server.tool(
  "execute-command",
  "Execute a command in a tmux pane. By default, it returns immediately. If a timeout is provided, it will wait for the command to complete and return the result. For interactive applications (REPLs, editors), use `rawMode=true`. IMPORTANT: When `rawMode=false` (default), avoid heredoc syntax (cat << EOF) and other multi-line constructs as they conflict with command wrapping. For file writing, prefer: printf 'content\\n' > file, echo statements, or write to temp files instead",
  {
    paneId: z.string().describe("ID of the tmux pane"),
    command: z.string().describe("Command to execute"),
    timeout: z.number().optional().describe("Timeout in seconds to wait for command completion. Defaults to 15 seconds."),
    rawMode: z.boolean().optional().describe("Execute command without wrapper markers for REPL/interactive compatibility. Disables get-command-result status tracking. Use capture-pane after execution to verify command outcome."),
    noEnter: z.boolean().optional().describe("Send keystrokes without pressing Enter. For TUI navigation in apps like btop, vim, less. Supports special keys (Up, Down, Escape, Tab, etc.) and strings (sent char-by-char for proper filtering). Automatically applies rawMode. Use capture-pane after to see results.")
  },
  async ({ paneId, command, timeout = 15, rawMode, noEnter }) => {
    try {
      // If noEnter is true, automatically apply rawMode
      const effectiveRawMode = noEnter || rawMode;
      const commandId = await tmux.executeCommand(paneId, command, effectiveRawMode, noEnter);

      if (effectiveRawMode) {
        const modeText = noEnter ? "Keys sent without Enter" : "Interactive command started (rawMode)";
        return {
          content: [{
            type: "text",
            text: `${modeText}.\n\nStatus tracking is disabled.\nUse 'capture-pane' with paneId '${paneId}' to verify the command outcome.\n\nCommand ID: ${commandId}`
          }]
        };
      }

      // If no timeout, return immediately
      if (timeout === undefined) {
        const resourceUri = `tmux://command/${commandId}/result`;
        return {
          content: [{
            type: "text",
            text: `Command execution started with ID: ${commandId}\n\nTo get results, use 'get-command-result' with commandId '${commandId}' or subscribe to the resource: ${resourceUri}\n\nStatus will change from 'pending' to 'completed' or 'error' when finished.`
          }]
        };
      }

      // With timeout, poll for the result
      const startTime = Date.now();
      const timeoutMs = timeout * 1000;

      while (Date.now() - startTime < timeoutMs) {
        const cmd = await tmux.checkCommandStatus(commandId);
        if (cmd && cmd.status !== 'pending') {
          const resultText = `Command ID: ${commandId}\nStatus: ${cmd.status}\nExit code: ${cmd.exitCode}\nCommand: ${cmd.command}\n\n--- Output ---\n${cmd.result}`;
          return {
            content: [{ type: "text", text: resultText }]
          };
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      }

      // If timeout is reached, return the current result
      const finalCmd = await tmux.getCommand(commandId);
      const resultText = finalCmd
        ? `Timeout reached. Command ID: ${commandId}\nCurrent status: ${finalCmd.status}\n\n--- Output ---\n${finalCmd.result || 'No output yet.'}. Command is still running, You can after use \`get-command-result\` get result.`
        : `Timeout reached. Command ${commandId} not found.`;

      return {
        content: [{ type: "text", text: resultText }],
        isError: true
      };

    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error executing command: ${error}`
        }],
        isError: true
      };
    }
  }
);

// Get command result - Tool
server.tool(
  "get-command-result",
  "Get the result of an executed command",
  {
    commandId: z.string().describe("ID of the executed command")
  },
  async ({ commandId }) => {
    try {
      // Check and update command status
      const command = await tmux.checkCommandStatus(commandId);

      if (!command) {
        return {
          content: [{
            type: "text",
            text: `Command not found: ${commandId}`
          }],
          isError: true
        };
      }

      // Format the response based on command status
      let resultText;
      if (command.status === 'pending') {
        if (command.result) {
          resultText = `Status: ${command.status}\nCommand: ${command.command}\n\n--- Message ---\n${command.result}`;
        } else {
          resultText = `Command still executing...\nStarted: ${command.startTime.toISOString()}\nCommand: ${command.command}`;
        }
      } else {
        resultText = `Status: ${command.status}\nExit code: ${command.exitCode}\nCommand: ${command.command}\n\n--- Output ---\n${command.result}`;
      }

      return {
        content: [{
          type: "text",
          text: resultText
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving command result: ${error}`
        }],
        isError: true
      };
    }
  }
);

// Expose tmux session list as a resource
server.resource(
  "Tmux Sessions",
  "tmux://sessions",
  async () => {
    try {
      const sessions = await tmux.listSessions();
      return {
        contents: [{
          uri: "tmux://sessions",
          text: JSON.stringify(sessions.map(session => ({
            id: session.id,
            name: session.name,
            attached: session.attached,
            windows: session.windows
          })), null, 2)
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: "tmux://sessions",
          text: `Error listing tmux sessions: ${error}`
        }]
      };
    }
  }
);

// Expose pane content as a resource
server.resource(
  "Tmux Pane Content",
  new ResourceTemplate("tmux://pane/{paneId}", {
    list: async () => {
      try {
        // Get all sessions
        const sessions = await tmux.listSessions();
        const paneResources = [];

        // For each session, get all windows
        for (const session of sessions) {
          const windows = await tmux.listWindows(session.id);

          // For each window, get all panes
          for (const window of windows) {
            const panes = await tmux.listPanes(window.id);

            // For each pane, create a resource with descriptive name
            for (const pane of panes) {
              paneResources.push({
                name: `Pane: ${session.name} - ${pane.id} - ${pane.title} ${pane.active ? "(active)" : ""}`,
                uri: `tmux://pane/${pane.id}`,
                description: `Content from pane ${pane.id} - ${pane.title} in session ${session.name}`
              });
            }
          }
        }

        return {
          resources: paneResources
        };
      } catch (error) {
        server.server.sendLoggingMessage({
          level: 'error',
          data: `Error listing panes: ${error}`
        });

        return { resources: [] };
      }
    }
  }),
  async (uri, { paneId }) => {
    try {
      // Ensure paneId is a string
      const paneIdStr = Array.isArray(paneId) ? paneId[0] : paneId;
      // Default to no colors for resources to maintain clean programmatic access
      const result = await tmux.capturePaneContent(paneIdStr, 200, false);
      return {
        contents: [{
          uri: uri.href,
          text: result.content || "No content captured"
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: `Error capturing pane content: ${error}`
        }]
      };
    }
  }
);

// Create dynamic resource for command executions
server.resource(
  "Command Execution Result",
  new ResourceTemplate("tmux://command/{commandId}/result", {
    list: async () => {
      // Only list active commands that aren't too old
      tmux.cleanupOldCommands(10); // Clean commands older than 10 minutes

      const resources = [];
      for (const id of tmux.getActiveCommandIds()) {
        const command = tmux.getCommand(id);
        if (command) {
          resources.push({
            name: `Command: ${command.command.substring(0, 30)}${command.command.length > 30 ? '...' : ''}`,
            uri: `tmux://command/${id}/result`,
            description: `Execution status: ${command.status}`
          });
        }
      }

      return { resources };
    }
  }),
  async (uri, { commandId }) => {
    try {
      // Ensure commandId is a string
      const commandIdStr = Array.isArray(commandId) ? commandId[0] : commandId;

      // Check command status
      const command = await tmux.checkCommandStatus(commandIdStr);

      if (!command) {
        return {
          contents: [{
            uri: uri.href,
            text: `Command not found: ${commandIdStr}`
          }]
        };
      }

      // Format the response based on command status
      let resultText;
      if (command.status === 'pending') {
        // For rawMode commands, we set a result message while status remains 'pending'
        // since we can't track their actual completion
        if (command.result) {
          resultText = `Status: ${command.status}\nCommand: ${command.command}\n\n--- Message ---\n${command.result}`;
        } else {
          resultText = `Command still executing...\nStarted: ${command.startTime.toISOString()}\nCommand: ${command.command}`;
        }
      } else {
        resultText = `Status: ${command.status}\nExit code: ${command.exitCode}\nCommand: ${command.command}\n\n--- Output ---\n${command.result}`;
      }

      return {
        contents: [{
          uri: uri.href,
          text: resultText
        }]
      };
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: `Error retrieving command result: ${error}`
        }]
      };
    }
  }
);
// Get active pane - Tool
server.tool(
  "get-active-pane",
  "Get the currently active pane in the attached tmux session",
  {},
  async () => {
    try {
      const pane = await tmux.getActivePane();
      return {
        content: [{
          type: "text",
          text: pane ? JSON.stringify(pane, null, 2) : "No active pane found"
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error getting active pane: ${error}`
        }],
        isError: true
      };
    }
  }
);

async function main() {
  try {
    const { values } = parseArgs({
      options: {
        'shell-type': { type: 'string', default: 'bash', short: 's' },
        'port': { type: 'string', default: '8080', short: 'p' }
      }
    });

    // Set shell configuration
    tmux.setShellConfig({
      type: values['shell-type'] as string
    });

    const app = express();
    const port = parseInt(values.port as string, 10);
    const transports: { [sessionId: string]: SSEServerTransport } = {};

    app.get("/sse", async (req, res) => {
      const transport = new SSEServerTransport('/messages', res);
      transports[transport.sessionId] = transport;
      res.on("close", () => {
        delete transports[transport.sessionId];
      });
      await server.connect(transport);
    });

    app.post("/messages", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const transport = transports[sessionId];
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send('No transport found for sessionId');
      }
    });

    app.listen(port, () => {
      console.log(`Mcp Server is running on port ${port}`);
    });

  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
