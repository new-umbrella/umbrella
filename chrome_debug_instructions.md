# Chrome Remote Debugging Setup Instructions

To use the Puppeteer MCP server, you need to start Chrome with remote debugging enabled:

## Windows Instructions

1. Close all Chrome windows completely
2. Open Command Prompt or PowerShell
3. Run the following command:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
   ```
   (Adjust the path if Chrome is installed in a different location)
4. Once Chrome opens, navigate to any website
5. Now you can use the Puppeteer MCP server functions

## Testing the Connection

After starting Chrome with remote debugging, you can test the connection with:

```
mcp_githubcommerajmehrabipuppeteer_mcp_server_puppeteer_connect_
```

And then navigate to a URL with:

```
mcp_githubcommerajmehrabipuppeteer_mcp_server_puppeteer_navigate
```