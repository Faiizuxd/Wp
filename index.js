const express = require("express");
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const multer = require("multer");
const {
    makeInMemoryStore,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    fetchLatestBaileysVersion,
    makeWASocket,
    isJidBroadcast
} = require("@whiskeysockets/baileys");

const app = express();
const PORT = 20868;

// Create necessary directories
if (!fs.existsSync("temp")) {
    fs.mkdirSync("temp");
}
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}
if (!fs.existsSync("logs")) {
    fs.mkdirSync("logs");
}

const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store active client instances and tasks
const activeClients = new Map();
const activeTasks = new Map();
const taskLogs = new Map();
const userSessions = new Map(); // Store user sessions by IP

// Middleware to track user sessions
app.use((req, res, next) => {
    const userIP = req.ip || req.connection.remoteAddress;
    req.userIP = userIP;
    next();
});

app.get("/", (req, res) => {
    res.send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>WhatsApp Server</title>
<style>
  :root {
    --wp-blue: #0073aa;
    --wp-blue-dark: #005a87;
    --wp-gray-light: #f6f7f7;
    --wp-gray: #dcdcde;
    --wp-gray-dark: #8c8f94;
    --wp-text: #2c3338;
    --wp-border: #c3c4c7;
    --wp-success: #00a32a;
    --wp-warning: #dba617;
    --wp-error: #d63638;
    --wp-shadow: 0 1px 3px rgba(0,0,0,0.1);
    --wp-shadow-lg: 0 4px 6px rgba(0,0,0,0.1);
    --wp-radius: 4px;
    --wp-radius-lg: 8px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  }

  html, body {
    height: 100%;
    margin: 0;
    background-color: var(--wp-gray-light);
    color: var(--wp-text);
    line-height: 1.5;
  }

  .wrap {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  /* Header Styles */
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--wp-border);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .logo {
    width: 48px;
    height: 48px;
    border-radius: var(--wp-radius);
    background: var(--wp-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: white;
    box-shadow: var(--wp-shadow);
  }

  h1 {
    font-size: 24px;
    margin: 0;
    color: var(--wp-text);
    font-weight: 600;
  }

  p.lead {
    margin: 0;
    color: var(--wp-gray-dark);
    font-size: 14px;
  }

  /* Main Layout */
  main {
    display: grid;
    grid-template-columns: 1fr 350px;
    gap: 30px;
    align-items: start;
  }

  /* Card Styles */
  .card {
    background: white;
    border-radius: var(--wp-radius-lg);
    padding: 24px;
    border: 1px solid var(--wp-border);
    box-shadow: var(--wp-shadow);
    margin-bottom: 20px;
  }

  .card h2 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 18px;
    font-weight: 600;
    color: var(--wp-text);
    padding-bottom: 12px;
    border-bottom: 1px solid var(--wp-border);
  }

  .card h3 {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 16px;
    font-weight: 600;
    color: var(--wp-text);
  }

  /* Form Elements */
  .form-row {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  label {
    font-size: 14px;
    color: var(--wp-text);
    font-weight: 500;
    margin-bottom: 4px;
  }

  input[type="text"], input[type="number"], select, textarea {
    height: 40px;
    padding: 8px 12px;
    border-radius: var(--wp-radius);
    border: 1px solid var(--wp-border);
    background: white;
    color: var(--wp-text);
    font-size: 14px;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s ease-in-out;
  }

  input[type="text"]:focus, input[type="number"]:focus, select:focus, textarea:focus {
    border-color: var(--wp-blue);
    outline: none;
    box-shadow: 0 0 0 1px var(--wp-blue);
  }

  input[type="file"] {
    height: auto;
    padding: 8px 0;
  }

  /* Button Styles */
  button.primary, button.ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
    white-space: nowrap;
    border-radius: var(--wp-radius);
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.15s ease-in-out;
    border: 1px solid transparent;
  }

  button.primary {
    height: 40px;
    background: var(--wp-blue);
    color: white;
    border-color: var(--wp-blue);
  }

  button.primary:hover {
    background: var(--wp-blue-dark);
    border-color: var(--wp-blue-dark);
  }

  button.ghost {
    height: 38px;
    background: white;
    color: var(--wp-text);
    border-color: var(--wp-border);
  }

  button.ghost:hover {
    background: var(--wp-gray-light);
    border-color: var(--wp-gray-dark);
  }

  .small {
    font-size: 13px;
    color: var(--wp-gray-dark);
  }

  /* Session ID Display */
  .session-id {
    background: var(--wp-gray-light);
    padding: 8px 12px;
    border-radius: var(--wp-radius);
    border: 1px solid var(--wp-border);
    font-family: monospace;
    font-size: 13px;
    color: var(--wp-text);
  }

  /* Status List */
  .status-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    border-radius: var(--wp-radius);
    background: var(--wp-gray-light);
    border: 1px solid var(--wp-border);
  }

  .status-value {
    font-weight: 600;
    font-size: 13px;
    padding: 4px 8px;
    border-radius: 3px;
  }

  .status-value.connected {
    background: #e7f5e9;
    color: var(--wp-success);
  }

  .status-value.disconnected {
    background: #fcf0f1;
    color: var(--wp-error);
  }

  /* Logs Box */
  .logs {
    max-height: 300px;
    overflow: auto;
    padding: 16px;
    border-radius: var(--wp-radius);
    background: #f8f9fa;
    font-family: monospace;
    font-size: 13px;
    color: var(--wp-text);
    line-height: 1.4;
    border: 1px solid var(--wp-border);
  }

  /* Footer */
  footer {
    margin-top: 40px;
    text-align: center;
    color: var(--wp-gray-dark);
    font-size: 13px;
    padding-top: 20px;
    border-top: 1px solid var(--wp-border);
  }

  /* Responsive */
  @media (max-width: 900px) {
    main {
      grid-template-columns: 1fr;
    }
    
    .logs {
      max-height: 220px;
    }
  }

  @media (max-width: 600px) {
    .wrap {
      padding: 16px;
    }
    
    header {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .logo {
      width: 40px;
      height: 40px;
    }
    
    input[type="text"], input[type="number"], select {
      height: 38px;
      font-size: 14px;
    }
    
    button.primary {
      height: 38px;
      font-size: 14px;
    }
    
    .card {
      padding: 20px;
    }
  }

  /* Form Controls */
  .form-controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }

  .inline-form {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .inline-form input {
    height: 38px;
    padding: 8px;
    border-radius: var(--wp-radius);
    border: 1px solid var(--wp-border);
    background: white;
    color: var(--wp-text);
    font-size: 14px;
    width: 180px;
  }

  /* Helper Text */
  .helper {
    font-size: 13px;
    color: var(--wp-gray-dark);
    margin-top: 8px;
  }
</style>
</head>

<body>
  <div class="wrap">
    <header>
      <div class="brand">
        <div class="logo">WS</div>
        <div>
          <h1>WhatsApp Server</h1>
          <p class="lead">Made By Faizan Rajpoot</p>
        </div>
      </div>
      <div class="form-controls">
        <button class="ghost" onclick="showMySessionId()">Show Session</button>
        <a href="/" style="text-decoration:none"><button class="ghost">Home</button></a>
      </div>
    </header>

    <main>
      <!-- Left Column: Actions -->
      <section>
        <div class="card" aria-labelledby="pairTitle">
          <h2 id="pairTitle">Pair Device</h2>
          <div class="form-row">
            <label for="numberInput">WhatsApp Number (with country code)</label>
            <input id="numberInput" name="number" type="text" placeholder="e.g. 92300****** or 91951*****" />
            <div class="form-controls">
              <button class="primary" onclick="generatePairingCode()">Generate Pairing Code</button>
              <button class="ghost" onclick="clearSession()">Clear Session</button>
            </div>
            <div id="pairingResult" class="helper"></div>
          </div>
        </div>

        <div class="card" aria-labelledby="sendTitle">
          <h2 id="sendTitle">Send Messages</h2>
          <form id="sendForm" action="/send-message" method="POST" enctype="multipart/form-data" class="form-row">
            <label for="targetType">Target Type</label>
            <select id="targetType" name="targetType" required>
              <option value="">-- Select --</option>
              <option value="number">Number</option>
              <option value="group">Group UID</option>
            </select>

            <label for="target">Target Number / Group UID</label>
            <input id="target" name="target" type="text" placeholder="e.g. 92300xxxxxxx or 12345" required />

            <label for="messageFile">Message File (.txt)</label>
            <input id="messageFile" name="messageFile" type="file" accept=".txt" required />

            <label for="prefix">Message Prefix (Hater Name)</label>
            <input id="prefix" name="prefix" type="text" placeholder="Hello," />

            <label for="delaySec">Delay (seconds)</label>
            <input id="delaySec" name="delaySec" type="number" min="1" value="10" required />

            <div class="form-controls">
              <button class="primary" type="submit">Start Sending</button>
              <button class="ghost" type="button" onclick="getMyGroups()">Show Groups</button>
            </div>
          </form>
        </div>

        <div class="card" aria-labelledby="sessionActions">
          <h2 id="sessionActions">Session Controls</h2>
          <div class="form-controls">
            <form id="viewSessionForm" action="/view-session" method="POST" class="inline-form">
              <input name="sessionId" placeholder="Session ID to view" required />
              <button class="ghost" type="submit">View</button>
            </form>

            <form id="stopSessionForm" action="/stop-session" method="POST" class="inline-form">
              <input name="sessionId" placeholder="Session ID to stop" required />
              <button class="ghost" type="submit">Stop</button>
            </form>
          </div>
        </div>
      </section>

      <!-- Right Column: Status & Logs -->
      <aside>
        <div class="card">
          <h3>Status</h3>
          <div class="status-list">
            <div class="status-item">
              <div>Connection</div>
              <div id="connStatus" class="status-value disconnected">DISCONNECTED</div>
            </div>
            <div class="status-item">
              <div>Active Session</div>
              <div id="activeSession" class="session-id">—</div>
            </div>
            <div class="status-item">
              <div>Tasks</div>
              <div id="taskCount" class="small">0</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3>Live Logs</h3>
          <div id="logBox" class="logs small">No logs yet.</div>
        </div>
      </aside>
    </main>

    <footer>
      <div class="small">© WhatsApp Server • Keep your pairing codes private</div>
    </footer>
  </div>

  <script>
    // Small helper functions - keep same API calls as original
    async function generatePairingCode() {
      const number = document.getElementById('numberInput').value.trim();
      if (!number) { 
        alert('Enter number'); 
        return; 
      }
      
      const res = await fetch('/code?number=' + encodeURIComponent(number));
      const text = await res.text();
      document.getElementById('pairingResult').innerHTML = text;
      // try extract session id from returned HTML and store (original code did this too)
      // the server sets localStorage via returned HTML script when pairing succeeds
    }

    function showMySessionId() {
      const sessionId = localStorage.getItem('wa_session_id');
      if (sessionId) {
        document.getElementById('activeSession').textContent = sessionId;
        document.getElementById('activeSession').style.fontFamily = 'monospace';
      } else {
        alert('No active session in browser localStorage. Generate pairing first.');
      }
    }

    function clearSession() {
      localStorage.removeItem('wa_session_id');
      document.getElementById('activeSession').textContent = '—';
      alert('Local session cleared (browser only).');
    }

    async function getMyGroups() {
      try {
        const res = await fetch('/get-groups');
        const html = await res.text();
        // display groups in log box for quick view
        document.getElementById('logBox').innerHTML = html;
      } catch (e) {
        console.error(e);
        document.getElementById('logBox').textContent = 'Error fetching groups';
      }
    }

    // Small SSE-like polling to update connection & logs (non-intrusive)
    async function pollStatus() {
      try {
        const sessionId = localStorage.getItem('wa_session_id');
        if (sessionId) {
          // fetch session-status page and parse small bits (cheap method)
          const res = await fetch('/session-status?sessionId=' + encodeURIComponent(sessionId));
          if (res.ok) {
            const html = await res.text();
            // quick extraction: connection status string between "Connection Status:" and next tag
            const connMatch = html.match(/Connection Status:[\s\S]*?<span[^>]*>([^<]+)</i);
            const connText = connMatch ? connMatch[1].trim() : null;
            if (connText) {
              const el = document.getElementById('connStatus');
              el.textContent = connText.includes('CONNECTED') ? 'CONNECTED' : 'DISCONNECTED';
              el.className = 'status-value ' + (connText.includes('CONNECTED') ? 'connected' : 'disconnected');
            }
            // update task count
            const taskMatches = html.match(/Active Tasks[\s\S]*?<div class="task-list">/i);
            document.getElementById('taskCount').textContent = taskMatches ? 'Running' : '0';
            document.getElementById('activeSession').textContent = sessionId;
          }
        }
      } catch (e) {
        // ignore
      } finally {
        setTimeout(pollStatus, 8000);
      }
    }
    pollStatus();
  </script>
</body>
</html>
`);
});

app.get("/code", async (req, res) => {
    const num = req.query.number.replace(/[^0-9]/g, "");
    const userIP = req.userIP;
    const sessionId = `session_${userIP}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const sessionPath = path.join("temp", sessionId);

    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        
        const waClient = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" }))
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }).child({ level: "fatal" }),
            browser: Browsers.ubuntu('Chrome'),
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
            shouldIgnoreJid: jid => isJidBroadcast(jid),
            getMessage: async key => {
                return {}
            }
        });

        if (!waClient.authState.creds.registered) {
            await delay(1500);
            
            const phoneNumber = num.replace(/[^0-9]/g, "");
            const code = await waClient.requestPairingCode(phoneNumber);
            
            // Store session with user IP
            activeClients.set(sessionId, {  
                client: waClient,  
                number: num,  
                authPath: sessionPath,
                isConnected: false,
                tasks: []
            });  
            
            // Store user session mapping
            userSessions.set(userIP, sessionId);

            res.send(`  
                <div style="
    margin-top: 20px; 
    padding: 20px; 
    background: rgba(20, 0, 0, 0.8); 
    border-radius: 12px; 
    border: 1px solid #ff1a1a;
    box-shadow: 0 0 6px #ff1a1a, 0 0 14px rgba(255,0,0,0.5);
    color: #ffcccc;
">
    <h2 style="margin-top:0; color:#ff4d4d;">Pairing Code: ${code}</h2>  

    <p style="font-size: 18px; margin-bottom: 20px; color:#ffb3b3;">
        Save this code to pair your device
    </p>

    <div class="instructions" style="color:#ffcccc;">
        <p style="font-size: 16px;"><strong>To pair your device:</strong></p>
        <ol>
            <li>Open WhatsApp on your phone</li>
            <li>Go to Settings → Linked Devices → Link a Device</li>
            <li>Enter this pairing code when prompted</li>
            <li>After pairing, start sending messages using the form below</li>
        </ol>
    </div>

    <p style="font-size: 16px; margin-top: 20px; color:#ff9999;">
        <strong>Your Session ID: ${sessionId}</strong>
    </p>
    <p style="font-size: 14px; color:#b36b6b;">
        Save this Session ID to manage your message sending tasks
    </p>

    <script>
        localStorage.setItem('wa_session_id', '${sessionId}');
    </script>

    <a href="/" style="
        display:inline-block;
        margin-top:15px;
        padding:10px 18px;
        border-radius:10px;
        border:1px solid #ff1a1a;
        color:#ff4d4d;
        text-decoration:none;
        font-weight:600;
        box-shadow:0 0 6px #ff1a1a, 0 0 14px rgba(255,0,0,0.4);
        transition:0.2s;
    " 
    onmouseover="this.style.background='rgba(255,0,0,0.1)';" 
    onmouseout="this.style.background='transparent';">
        Go Back to Home
    </a>  
</div>

            `);  
        }  

        waClient.ev.on("creds.update", saveCreds);  
        waClient.ev.on("connection.update", async (s) => {  
            const { connection, lastDisconnect } = s;  
            if (connection === "open") {  
                console.log(`WhatsApp Connected for ${num}! Session ID: ${sessionId}`);  
                const clientInfo = activeClients.get(sessionId);
                if (clientInfo) {
                    clientInfo.isConnected = true;
                }
            } else if (connection === "close") {
                const clientInfo = activeClients.get(sessionId);
                if (clientInfo) {
                    clientInfo.isConnected = false;
                    console.log(`Connection closed for Session ID: ${sessionId}`);
                    
                    // Try to reconnect if not manually stopped
                    if (lastDisconnect?.error?.output?.statusCode !== 401) {
                        console.log(`Attempting to reconnect for Session ID: ${sessionId}...`);
                        await delay(10000);
                        initializeClient(sessionId, num, sessionPath);
                    }
                }
            }  
        });

    } catch (err) {
        console.error("Error in pairing:", err);
        res.send(`<div style="padding: 20px; background: rgba(80,0,0,0.8); border-radius: 10px; border: 1px solid #ff5555;">
                    <h2>Error: ${err.message}</h2><br><a href="/">Go Back</a>
                  </div>`);
    }
});

async function initializeClient(sessionId, num, sessionPath) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        
        const waClient = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" }))
            },
            printQRInTerminal: false,
            logger: pino({ level: "fatal" }).child({ level: "fatal" }),
            browser: Browsers.ubuntu('Chrome'),
            syncFullHistory: false
        });

        const clientInfo = activeClients.get(sessionId) || {
            number: num,
            authPath: sessionPath,
            tasks: []
        };
        
        clientInfo.client = waClient;
        activeClients.set(sessionId, clientInfo);

        waClient.ev.on("creds.update", saveCreds);  
        waClient.ev.on("connection.update", async (s) => {  
            const { connection, lastDisconnect } = s;  
            if (connection === "open") {  
                console.log(`Reconnected successfully for Session ID: ${sessionId}`);  
                clientInfo.isConnected = true;
            } else if (connection === "close") {
                clientInfo.isConnected = false;
                console.log(`Connection closed again for Session ID: ${sessionId}`);
                
                if (lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log(`Reconnecting again for Session ID: ${sessionId}...`);
                    await delay(10000);
                    initializeClient(sessionId, num, sessionPath);
                }
            }  
        });

    } catch (err) {
        console.error(`Reconnection failed for Session ID: ${sessionId}`, err);
    }
}

app.post("/send-message", upload.single("messageFile"), async (req, res) => {
    const { target, targetType, delaySec, prefix } = req.body;
    const userIP = req.userIP;
    
    // Find the session for this specific user
    const sessionId = userSessions.get(userIP);
    if (!sessionId || !activeClients.has(sessionId)) {
        return res.send(`<div class="box"><h2>Error: No active WhatsApp session found for your IP. Please generate a pairing code first.</h2><br><a href="/">Go Back</a></div>`);
    }

    const clientInfo = activeClients.get(sessionId);
    const { client: waClient, number: senderNumber } = clientInfo;
    const filePath = req.file?.path;

    if (!target || !filePath || !targetType || !delaySec) {
        return res.send(`<div class="box"><h2>Error: Missing required fields</h2><br><a href="/">Go Back</a></div>`);
    }

    try {
        const messages = fs.readFileSync(filePath, "utf-8").split("\n").filter(msg => msg.trim() !== "");
        
        if (messages.length === 0) {
            return res.send(`<div class="box"><h2>Error: Message file is empty</h2><br><a href="/">Go Back</a></div>`);
        }

        // Create a task ID for this specific sending task
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        // Store task information under the session
        const taskInfo = {
            taskId,
            target,
            targetType,
            isSending: true,
            stopRequested: false,
            totalMessages: messages.length,
            sentMessages: 0,
            currentMessageIndex: 0,
            startTime: new Date(),
            logs: []
        };
        
        // Add task to session
        if (!clientInfo.tasks) clientInfo.tasks = [];
        clientInfo.tasks.push(taskInfo);
        
        // Initialize logs for this task
        taskLogs.set(taskId, []);
        
        // Save session ID to localStorage via client
        res.send(`<script>
                    localStorage.setItem('wa_session_id', '${sessionId}');
                    window.location.href = '/session-status?sessionId=${sessionId}';
                  </script>`);
        
        // Start sending messages in the background
        sendMessagesLoop(sessionId, taskId, messages, waClient, target, targetType, delaySec, prefix, senderNumber);

    } catch (error) {
        console.error(`[${sessionId}] Error:`, error);
        return res.send(`<div class="box"><h2>Error: ${error.message}</h2><br><a href="/">Go Back</a></div>`);
    }
});

async function sendMessagesLoop(sessionId, taskId, messages, waClient, target, targetType, delaySec, prefix, senderNumber) {
    const clientInfo = activeClients.get(sessionId);
    if (!clientInfo) return;
    
    const taskInfo = clientInfo.tasks.find(t => t.taskId === taskId);
    if (!taskInfo) return;
    
    const logs = taskLogs.get(taskId) || [];
    
    try {
        let index = taskInfo.currentMessageIndex;
        const recipient = targetType === "group" ? target + "@g.us" : target + "@s.whatsapp.net";
        
        while (taskInfo.isSending && !taskInfo.stopRequested && clientInfo.isConnected) {
            let msg = messages[index];
            if (prefix && prefix.trim() !== "") {
                msg = `${prefix.trim()} ${msg}`;
            }
            
            const timestamp = new Date().toLocaleString();
            const messageNumber = taskInfo.sentMessages + 1;
            
            try {
                await waClient.sendMessage(recipient, { text: msg });
                
                // Log success
                const successLog = {
                    type: "success",
                    message: `[${timestamp}] Message #${messageNumber} sent successfully from ${senderNumber} to ${target}`,
                    details: `Message: "${msg}"`,
                    timestamp: new Date()
                };
                
                logs.unshift(successLog); // Add to beginning to show newest first
                // Keep only last 100 logs to prevent memory issues
                if (logs.length > 100) logs.pop();
                taskLogs.set(taskId, logs);
                
                console.log(`[${sessionId}] Sent message #${messageNumber} from ${senderNumber} to ${target}`);
                
                taskInfo.sentMessages++;
                index = (index + 1) % messages.length; // Loop back to start when reaching end
                taskInfo.currentMessageIndex = index;
                
            } catch (sendError) {
                // Log error
                const errorLog = {
                    type: "error",
                    message: `[${timestamp}] Failed to send message #${messageNumber} from ${senderNumber} to ${target}`,
                    details: `Error: ${sendError.message}`,
                    timestamp: new Date()
                };
                
                logs.unshift(errorLog);
                // Keep only last 100 logs to prevent memory issues
                if (logs.length > 100) logs.pop();
                taskLogs.set(taskId, logs);
                
                console.error(`[${sessionId}] Error sending message:`, sendError);
                
                // If it's a connection error, try to reconnect
                if (sendError.message.includes("connection") || sendError.message.includes("socket")) {
                    console.log(`Connection issue detected for session ${sessionId}, waiting before retry...`);
                    await delay(5000);
                    continue;
                }
            }
            
            await delay(delaySec * 1000);
        }
        
        // Update task status when done
        taskInfo.endTime = new Date();
        taskInfo.isSending = false;
        
        // Log completion
        const completionLog = {
            type: "info",
            message: `[${new Date().toLocaleString()}] Task ${taskInfo.stopRequested ? 'stopped' : 'completed'}`,
            details: `Total messages sent: ${taskInfo.sentMessages}`,
            timestamp: new Date()
        };
        
        logs.unshift(completionLog);
        taskLogs.set(taskId, logs);
        
    } catch (error) {
        console.error(`[${sessionId}] Error in message loop:`, error);
        
        const errorLog = {
            type: "error",
            message: `[${new Date().toLocaleString()}] Critical error in task execution`,
            details: `Error: ${error.message}`,
            timestamp: new Date()
        };
        
        logs.unshift(errorLog);
        taskLogs.set(taskId, logs);
        
        taskInfo.error = error.message;
        taskInfo.isSending = false;
        taskInfo.endTime = new Date();
    }
}

app.get("/session-status", (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId || !activeClients.has(sessionId)) {
        return res.send(`<div class="box"><h2>Error: Invalid Session ID</h2><br><a href="/">Go Back</a></div>`);
    }

    const clientInfo = activeClients.get(sessionId);
    
    res.send(`
        <html>
        <head>
            <title>Session Status - ${sessionId}</title>
            <style>
                body { 
                    background: #000000;
            color: #f0f0f0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
            padding: 20px;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        .status-box {
            background: rgba(20, 20, 20, 0.95);
            padding: 30px;
            border-radius: 15px;
            margin: 20px auto;
            border: 1px solid #ff4444;
            text-align: center;
            box-shadow: 0 0 20px rgba(255, 50, 50, 0.3);
        }
        h1 {
            color: #ff4444;
            text-shadow: 0 0 10px rgba(255, 50, 50, 0.7);
                }
              
                .session-id {
                    font-size: 24px;
                    background: rgba(30, 50, 90, 0.7);
                    padding: 15px;
                    border-radius: 10px;
                    display: inline-block;
                    margin: 20px 0;
                    border: 1px solid #4deeea;
                }
                .status-item {
                    margin: 15px 0;
                    font-size: 20px;
                }
                .status-value {
                    font-weight: bold;
                    color: #74ee15;
                }
                .status-error {
                    color: #ff5555;
                }
                a {
                    display: inline-block;
                    margin-top: 30px;
                    padding: 15px 30px;
                    background: linear-gradient(to right, #4deeea, #74ee15);
                    color: #0a0a2a;
                    text-decoration: none;
                    font-weight: bold;
                    border-radius: 8px;
                    font-size: 20px;
                }
                .task-list {
                    margin: 30px 0;
                    text-align: left;
                }
                .task-item {
                    background: rgba(30, 50, 90, 0.7);
                    padding: 20px;
                    border-radius: 10px;
                    margin: 15px 0;
                    border: 1px solid #4deeea;
                }
                .task-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                .task-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #4deeea;
                }
                .task-status {
                    padding: 5px 10px;
                    border-radius: 5px;
                    font-size: 14px;
                    font-weight: bold;
                }
                .status-running {
                    background: rgba(116, 238, 21, 0.2);
                    color: #74ee15;
                }
                .status-stopped {
                    background: rgba(255, 85, 85, 0.2);
                    color: #ff5555;
                }
                .status-completed {
                    background: rgba(77, 238, 234, 0.2);
                    color: #4deeea;
                }
                .task-details {
                    margin: 10px 0;
                }
                .task-action {
                    margin-top: 15px;
                }
                .logs-container {
                    max-height: 500px;
                    overflow-y: auto;
                    background: rgba(0, 0, 0, 0.7);
                    padding: 15px;
                    border-radius: 10px;
                    margin: 20px 0;
                    text-align: left;
                    font-family: monospace;
                    font-size: 14px;
                }
                .log-entry {
                    margin: 8px 0;
                    padding: 8px;
                    border-radius: 5px;
                    border-left: 3px solid #4deeea;
                }
                .log-success {
                    border-left-color: #74ee15;
                    background: rgba(116, 238, 21, 0.1);
                }
                .log-error {
                    border-left-color: #ff5555;
                    background: rgba(255, 85, 85, 0.1);
                }
                .log-info {
                    border-left-color: #4deeea;
                    background: rgba(77, 238, 234, 0.1);
                }
                .auto-refresh {
                    margin: 20px 0;
                    font-size: 16px;
                }
            </style>
            <script>
                function refreshPage() {
                    location.reload();
                }
                
                function viewTaskLogs(taskId) {
                    window.location.href = '/task-logs?sessionId=${sessionId}&taskId=' + taskId;
                }
                
                function stopTask(taskId) {
                    if (confirm('Are you sure you want to stop this task?')) {
                        const form = document.createElement('form');
                        form.method = 'POST';
                        form.action = '/stop-task';
                        
                        const sessionInput = document.createElement('input');
                        sessionInput.type = 'hidden';
                        sessionInput.name = 'sessionId';
                        sessionInput.value = '${sessionId}';
                        form.appendChild(sessionInput);
                        
                        const taskInput = document.createElement('input');
                        taskInput.type = 'hidden';
                        taskInput.name = 'taskId';
                        taskInput.value = taskId;
                        form.appendChild(taskInput);
                        
                        document.body.appendChild(form);
                        form.submit();
                    }
                }
                
                // Auto-refresh every 10 seconds if any task is still running
                ${clientInfo.tasks && clientInfo.tasks.some(t => t.isSending) ? 'setTimeout(refreshPage, 10000);' : ''}
            </script>
        </head>
        <body>
            <div class="container">
                <h1>Session Status</h1>
                
                <div class="status-box">
                    <div class="session-id">Your Session ID: ${sessionId}</div>
                    
                    <div class="status-item">
                        Connection Status: <span class="status-value ${clientInfo.isConnected ? '' : 'status-error'}">${clientInfo.isConnected ? 'CONNECTED' : 'DISCONNECTED - Attempting to reconnect...'}</span>
                    </div>
                    
                    <div class="status-item">
                        WhatsApp Number: <span class="status-value">${clientInfo.number}</span>
                    </div>
                    
                    ${clientInfo.tasks && clientInfo.tasks.length > 0 ? `
                        <h2>Active Tasks</h2>
                        <div class="task-list">
                            ${clientInfo.tasks.map(task => `
                                <div class="task-item">
                                    <div class="task-header">
                                        <div class="task-title">Task: ${task.target} (${task.targetType})</div>
                                        <div class="task-status status-${task.isSending ? 'running' : task.stopRequested ? 'stopped' : 'completed'}">
                                            ${task.isSending ? 'RUNNING' : task.stopRequested ? 'STOPPED' : 'COMPLETED'}
                                        </div>
                                    </div>
                                    <div class="task-details">
                                        <div>Messages Sent: ${task.sentMessages} of ${task.totalMessages}</div>
                                        <div>Start Time: ${task.startTime.toLocaleString()}</div>
                                        ${task.endTime ? `<div>End Time: ${task.endTime.toLocaleString()}</div>` : ''}
                                        ${task.error ? `<div class="status-error">Error: ${task.error}</div>` : ''}
                                    </div>
                                    <div class="task-action">
                                        <button onclick="viewTaskLogs('${task.taskId}')" style="margin-right:10px; padding:8px 15px; background:#4deeea; color:#0a0a2a; border:none; border-radius:4px; cursor:pointer;">View Logs</button>
                                        ${task.isSending ? `<button onclick="stopTask('${task.taskId}')" style="padding:8px 15px; background:#ff5555; color:white; border:none; border-radius:4px; cursor:pointer;">Stop Task</button>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>No active tasks found for this session.</p>'}
                    
                    <div class="auto-refresh">
                        ${clientInfo.tasks && clientInfo.tasks.some(t => t.isSending) ? 'Page will auto-refresh every 10 seconds' : ''}
                    </div>
                </div>
                
                <a href="/">Return to Home</a>
            </div>
        </body>
        </html>
    `);
});

app.get("/task-logs", (req, res) => {
    const { sessionId, taskId } = req.query;
    if (!sessionId || !activeClients.has(sessionId) || !taskLogs.has(taskId)) {
        return res.send(`<div class="box"><h2>Error: Invalid Session or Task ID</h2><br><a href="/">Go Back</a></div>`);
    }

    const logs = taskLogs.get(taskId) || [];
    const clientInfo = activeClients.get(sessionId);
    const taskInfo = clientInfo.tasks.find(t => t.taskId === taskId);
    
    if (!taskInfo) {
        return res.send(`<div class="box"><h2>Error: Task not found</h2><br><a href="/">Go Back</a></div>`);
    }
    
    let logsHtml = '';
    logs.forEach(log => {
        logsHtml += '<div class="log-entry log-' + log.type + '">';
        logsHtml += '<div><strong>' + log.message + '</strong></div>';
        logsHtml += '<div>' + log.details + '</div>';
        logsHtml += '</div>';
    });
    
    if (logs.length === 0) {
        logsHtml = '<div class="log-entry log-info">No logs yet. Messages will start sending shortly...</div>';
    }
    
    res.send(`
        <html>
        <head>
            <title>Task Logs - ${taskId}</title>
            <style>
                body { 
                    background: #0a0a2a;
                    color: #e0e0ff;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    text-align: center;
                    padding: 20px;
                }
                .container {
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .status-box {
                    background: rgba(20, 40, 60, 0.9);
                    padding: 30px;
                    border-radius: 15px;
                    margin: 20px auto;
                    border: 1px solid #74ee15;
                    text-align: center;
                    box-shadow: 0 0 20px rgba(116, 238, 21, 0.3);
                }
                h1 {
                    color: #4deeea;
                    text-shadow: 0 0 10px rgba(77, 238, 234, 0.7);
                }
                .task-id {
                    font-size: 24px;
                    background: rgba(30, 50, 90, 0.7);
                    padding: 15px;
                    border-radius: 10px;
                    display: inline-block;
                    margin: 20px 0;
                    border: 1px solid #4deeea;
                }
                .status-item {
                    margin: 15px 0;
                    font-size: 20px;
                }
                .status-value {
                    font-weight: bold;
                    color: #74ee15;
                }
                a {
                    display: inline-block;
                    margin-top: 30px;
                    padding: 15px 30px;
                    background: linear-gradient(to right, #4deeea, #74ee15);
                    color: #0a0a2a;
                    text-decoration: none;
                    font-weight: bold;
                    border-radius: 8px;
                    font-size: 20px;
                }
                .logs-container {
                    max-height: 500px;
                    overflow-y: auto;
                    background: rgba(0, 0, 0, 0.7);
                    padding: 15px;
                    border-radius: 10px;
                    margin: 20px 0;
                    text-align: left;
                    font-family: monospace;
                    font-size: 14px;
                }
                .log-entry {
                    margin: 8px 0;
                    padding: 8px;
                    border-radius: 5px;
                    border-left: 3px solid #4deeea;
                }
                .log-success {
                    border-left-color: #74ee15;
                    background: rgba(116, 238, 21, 0.1);
                }
                .log-error {
                    border-left-color: #ff5555;
                    background: rgba(255, 85, 85, 0.1);
                }
                .log-info {
                    border-left-color: #4deeea;
                    background: rgba(77, 238, 234, 0.1);
                }
                .auto-refresh {
                    margin: 20px 0;
                    font-size: 16px;
                }
            </style>
            <script>
                function refreshPage() {
                    location.reload();
                }
                
                // Auto-refresh every 10 seconds if task is still running
                ${taskInfo.isSending ? 'setTimeout(refreshPage, 10000);' : ''}
                
                // Scroll to top of logs container (newest logs are at the top)
                window.onload = function() {
                    const logsContainer = document.querySelector('.logs-container');
                    if (logsContainer) {
                        logsContainer.scrollTop = 0;
                    }
                };
            </script>
        </head>
        <body>
            <div class="container">
                <h1>Task Logs</h1>
                
                <div class="status-box">
                    <div class="task-id">Task ID: ${taskId}</div>
                    
                    <div class="status-item">
                        Status: <span class="status-value">${taskInfo.isSending ? 'RUNNING' : taskInfo.stopRequested ? 'STOPPED' : 'COMPLETED'}</span>
                    </div>
                    
                    <div class="status-item">
                        Target: <span class="status-value">${taskInfo.target} (${taskInfo.targetType})</span>
                    </div>
                    
                    <div class="status-item">
                        Messages Sent: <span class="status-value">${taskInfo.sentMessages} of ${taskInfo.totalMessages}</span>
                    </div>
                    
                    <div class="status-item">
                        Start Time: <span class="status-value">${taskInfo.startTime.toLocaleString()}</span>
                    </div>
                    
                    ${taskInfo.endTime ? '<div class="status-item">End Time: <span class="status-value">' + taskInfo.endTime.toLocaleString() + '</span></div>' : ''}
                    
                    ${taskInfo.error ? '<div class="status-item" style="color:#ff5555;">Error: ' + taskInfo.error + '</div>' : ''}
                    
                    <div class="auto-refresh">
                        ${taskInfo.isSending ? 'Page will auto-refresh every 10 seconds' : ''}
                    </div>
                </div>
                
                <div class="status-box">
                    <h2>Live Logs (Newest First)</h2>
                    <div class="logs-container">
                        ${logsHtml}
                    </div>
                </div>
                
                <a href="/session-status?sessionId=${sessionId}">Return to Session Status</a>
            </div>
        </body>
        </html>
    `);
});

app.post("/view-session", (req, res) => {
    const { sessionId } = req.body;
    res.redirect(`/session-status?sessionId=${sessionId}`);
});

app.post("/stop-session", async (req, res) => {
    const { sessionId } = req.body;

    if (!activeClients.has(sessionId)) {
        return res.send(`<div class="box"><h2>Error: Invalid Session ID</h2><br><a href="/">Go Back</a></div>`);
    }

    try {
        const clientInfo = activeClients.get(sessionId);
        
        // Stop all tasks in this session
        if (clientInfo.tasks) {
            clientInfo.tasks.forEach(task => {
                task.stopRequested = true;
                task.isSending = false;
                task.endTime = new Date();
            });
        }
        
        // Close the WhatsApp connection
        if (clientInfo.client) {
            clientInfo.client.end();
        }
        
        // Remove from active clients
        activeClients.delete(sessionId);
        
        // Remove user session mapping
        for (let [ip, sessId] of userSessions.entries()) {
            if (sessId === sessionId) {
                userSessions.delete(ip);
                break;
            }
        }

        res.send(`  
            <div class="box">  
                <h2>Session ${sessionId} stopped successfully</h2>
                <p>All tasks in this session have been stopped.</p>
                <br><a href="/">Go Back to Home</a>  
            </div>  
        `);

    } catch (error) {
        console.error(`Error stopping session ${sessionId}:`, error);
        res.send(`<div class="box"><h2>Error stopping session</h2><p>${error.message}</p><br><a href="/">Go Back</a></div>`);
    }
});

app.post("/stop-task", async (req, res) => {
    const { sessionId, taskId } = req.body;

    if (!activeClients.has(sessionId)) {
        return res.send(`<div class="box"><h2>Error: Invalid Session ID</h2><br><a href="/">Go Back</a></div>`);
    }

    try {
        const clientInfo = activeClients.get(sessionId);
        const taskInfo = clientInfo.tasks.find(t => t.taskId === taskId);
        
        if (!taskInfo) {
            return res.send(`<div class="box"><h2>Error: Task not found</h2><br><a href="/">Go Back</a></div>`);
        }
        
        taskInfo.stopRequested = true;
        taskInfo.isSending = false;
        taskInfo.endTime = new Date();

        // Add stop log
        const logs = taskLogs.get(taskId) || [];
        logs.unshift({
            type: "info",
            message: `[${new Date().toLocaleString()}] Task stopped by user`,
            details: `Total messages sent: ${taskInfo.sentMessages}`,
            timestamp: new Date()
        });
        taskLogs.set(taskId, logs);

        res.send(`<script>window.location.href = '/session-status?sessionId=${sessionId}';</script>`);

    } catch (error) {
        console.error(`Error stopping task ${taskId}:`, error);
        res.send(`<div class="box"><h2>Error stopping task</h2><p>${error.message}</p><br><a href="/">Go Back</a></div>`);
    }
});

app.get("/get-groups", async (req, res) => {
    const userIP = req.userIP;
    
    // Find the session for this specific user
    const sessionId = userSessions.get(userIP);
    if (!sessionId || !activeClients.has(sessionId)) {
        return res.send(`<div style="padding:20px; background:rgba(80,0,0,0.8); border-radius:10px; border:1px solid #ff5555;">
                          <h2>Error: No active WhatsApp session found for your IP</h2>
                          <p>Please generate a pairing code first</p>
                         </div>`);
    }

    try {
        const { client: waClient, number: senderNumber } = activeClients.get(sessionId);
        const groups = await waClient.groupFetchAllParticipating();
        
        let groupsList = "<h2>Your Groups (From: " + senderNumber + ")</h2>";
        groupsList += "<div class='group-list'>";
        
        Object.keys(groups).forEach((groupId, index) => {
            const group = groups[groupId];
            groupsList += "<div class=\"group-item\">";
            groupsList += "<h3>" + (index + 1) + ". " + group.subject + "</h3>";
            groupsList += "<p><strong>Group ID:</strong> " + groupId.replace('@g.us', '') + "</p>";
            groupsList += "<p><strong>Participants:</strong> " + (group.participants ? group.participants.length : 'N/A') + "</p>";
            groupsList += "<p><strong>Created:</strong> " + new Date(group.creation * 1000).toLocaleDateString() + "</p>";
            groupsList += "</div>";
        });
        
        groupsList += "</div>";
        
        res.send(groupsList);

    } catch (error) {
        console.error("Error fetching groups:", error);
        res.send(`<div style="padding:20px; background:rgba(80,0,0,0.8); border-radius:10px; border:1px solid #ff5555;">
                    <h2>Error fetching groups</h2>
                    <p>${error.message}</p>
                  </div>`);
    }
});

// Cleanup function to remove inactive sessions
setInterval(() => {
    const now = Date.now();
    for (let [sessionId, clientInfo] of activeClients.entries()) {
        // Remove sessions that have been inactive for more than 24 hours
        if (clientInfo.tasks && clientInfo.tasks.length === 0) {
            const sessionTime = parseInt(sessionId.split('_')[2]);
            if (now - sessionTime > 24 * 60 * 60 * 1000) {
                if (clientInfo.client) {
                    clientInfo.client.end();
                }
                activeClients.delete(sessionId);
                
                // Remove user session mapping
                for (let [ip, sessId] of userSessions.entries()) {
                    if (sessId === sessionId) {
                        userSessions.delete(ip);
                        break;
                    }
                }
                
                console.log(`Cleaned up inactive session: ${sessionId}`);
            }
        }
    }
}, 60 * 60 * 1000); // Run every hour

process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    activeClients.forEach(({ client }, sessionId) => {
        client.end();
        console.log(`Closed connection for Session ID: ${sessionId}`);
    });
    process.exit();
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});


// ==== CRASH FIX HANDLERS ====

// Prevent app from crashing on unhandled errors
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
