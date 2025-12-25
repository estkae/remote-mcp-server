/**
 * Kerio Connect Integration Module
 *
 * Provides email access via IMAP/SMTP for the Remote MCP Server
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');

// Kerio Configuration from Environment Variables
const KERIO_CONFIG = {
  host: process.env.KERIO_HOST || '',
  imapPort: parseInt(process.env.KERIO_IMAP_PORT) || 993,
  smtpPort: parseInt(process.env.KERIO_SMTP_PORT) || 465,
  username: process.env.KERIO_USERNAME || '',
  password: process.env.KERIO_PASSWORD || '',
  useSsl: process.env.KERIO_USE_SSL !== 'false'
};

/**
 * Check if Kerio is configured
 */
function isKerioConfigured() {
  return !!(KERIO_CONFIG.host && KERIO_CONFIG.username && KERIO_CONFIG.password);
}

/**
 * Get IMAP connection
 */
function getImapConnection() {
  if (!isKerioConfigured()) {
    throw new Error('Kerio Connect not configured. Set KERIO_HOST, KERIO_USERNAME, KERIO_PASSWORD');
  }

  console.log(`📧 Creating IMAP connection to ${KERIO_CONFIG.host}:${KERIO_CONFIG.imapPort}`);

  return new Imap({
    user: KERIO_CONFIG.username,
    password: KERIO_CONFIG.password,
    host: KERIO_CONFIG.host,
    port: KERIO_CONFIG.imapPort,
    tls: KERIO_CONFIG.useSsl,
    tlsOptions: {
      rejectUnauthorized: false,
      servername: KERIO_CONFIG.host
    },
    authTimeout: 30000,
    connTimeout: 30000,
    keepalive: false,
    debug: (msg) => console.log(`📧 IMAP Debug: ${msg}`)
  });
}

/**
 * List emails from mailbox
 */
async function listEmails(params) {
  const { folder = 'INBOX', limit = 20, unreadOnly = false } = params;

  // Debug: Log configuration (ohne Passwort)
  console.log(`📧 Kerio listEmails - Host: ${KERIO_CONFIG.host}, User: ${KERIO_CONFIG.username}, Port: ${KERIO_CONFIG.imapPort}`);

  if (!isKerioConfigured()) {
    throw new Error('Kerio Connect not configured. Missing KERIO_HOST, KERIO_USERNAME or KERIO_PASSWORD');
  }

  return new Promise((resolve, reject) => {
    let imap;
    try {
      imap = getImapConnection();
    } catch (err) {
      return reject(new Error(`Failed to create IMAP connection: ${err.message}`));
    }
    const emails = [];
    let pendingParsers = 0;
    let fetchEnded = false;

    function checkComplete() {
      if (fetchEnded && pendingParsers === 0) {
        console.log(`📧 All ${emails.length} emails parsed, closing connection`);
        imap.end();
      }
    }

    imap.once('ready', () => {
      imap.openBox(folder, true, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        const searchCriteria = unreadOnly ? ['UNSEEN'] : ['ALL'];

        imap.search(searchCriteria, (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (results.length === 0) {
            imap.end();
            return resolve({ emails: [], total: 0, folder });
          }

          const fetchResults = results.slice(-limit);
          console.log(`📧 Fetching ${fetchResults.length} emails from ${folder}`);

          const fetch = imap.fetch(fetchResults, {
            bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
            struct: true
          });

          fetch.on('message', (msg, seqno) => {
            let email = { id: seqno };
            pendingParsers++;

            msg.on('body', (stream, info) => {
              simpleParser(stream, (err, parsed) => {
                if (!err) {
                  email.from = parsed.from?.text || '';
                  email.to = parsed.to?.text || '';
                  email.subject = parsed.subject || '';
                  email.date = parsed.date || '';
                }
                emails.push(email);
                pendingParsers--;
                checkComplete();
              });
            });
          });

          fetch.once('error', (err) => {
            console.error(`📧 Fetch error: ${err.message}`);
            imap.end();
            reject(err);
          });

          fetch.once('end', () => {
            console.log(`📧 Fetch completed, waiting for parsers...`);
            fetchEnded = true;
            checkComplete();
          });
        });
      });
    });

    imap.once('error', (err) => {
      console.error(`📧 Kerio IMAP Error: ${err.message}`);
      reject(new Error(`IMAP connection failed: ${err.message}`));
    });

    imap.once('end', () => {
      console.log(`📧 Connection closed, returning ${emails.length} emails`);
      resolve({
        emails: emails.reverse(),
        total: emails.length,
        folder: folder
      });
    });

    // Connection timeout
    const timeout = setTimeout(() => {
      console.error(`📧 Connection timeout after 30 seconds`);
      try { imap.end(); } catch (e) {}
      reject(new Error('IMAP connection timeout after 30 seconds'));
    }, 30000);

    imap.once('ready', () => clearTimeout(timeout));

    try {
      imap.connect();
    } catch (err) {
      clearTimeout(timeout);
      reject(new Error(`Failed to connect to IMAP: ${err.message}`));
    }
  });
}

/**
 * Read full email content
 */
async function readEmail(params) {
  const { emailId, folder = 'INBOX' } = params;

  return new Promise((resolve, reject) => {
    const imap = getImapConnection();

    imap.once('ready', () => {
      imap.openBox(folder, true, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        const fetch = imap.fetch([emailId], {
          bodies: '',
          struct: true
        });

        fetch.on('message', (msg, seqno) => {
          msg.on('body', (stream, info) => {
            simpleParser(stream, (err, parsed) => {
              imap.end();

              if (err) {
                return reject(err);
              }

              resolve({
                from: parsed.from?.text || '',
                to: parsed.to?.text || '',
                cc: parsed.cc?.text || '',
                subject: parsed.subject || '',
                date: parsed.date || '',
                text: parsed.text || '',
                html: parsed.html || '',
                attachments: parsed.attachments?.map(a => ({
                  filename: a.filename,
                  contentType: a.contentType,
                  size: a.size
                })) || []
              });
            });
          });
        });

        fetch.once('error', (err) => {
          imap.end();
          reject(err);
        });
      });
    });

    imap.once('error', (err) => {
      reject(err);
    });

    imap.connect();
  });
}

/**
 * Send email via SMTP
 */
async function sendEmail(params) {
  if (!isKerioConfigured()) {
    throw new Error('Kerio Connect not configured');
  }

  const { to, subject, text, html, cc, bcc } = params;

  const transporter = nodemailer.createTransport({
    host: KERIO_CONFIG.host,
    port: KERIO_CONFIG.smtpPort,
    secure: true,
    auth: {
      user: KERIO_CONFIG.username,
      pass: KERIO_CONFIG.password
    }
  });

  const mailOptions = {
    from: KERIO_CONFIG.username,
    to,
    subject,
    text,
    html,
    cc,
    bcc
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      message: `Email sent successfully to ${to}`
    };
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Search emails by query
 */
async function searchEmails(params) {
  const { query, folder = 'INBOX', limit = 50 } = params;

  return new Promise((resolve, reject) => {
    const imap = getImapConnection();
    const emails = [];

    imap.once('ready', () => {
      imap.openBox(folder, true, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        const searchCriteria = [
          'OR',
          ['SUBJECT', query],
          ['BODY', query]
        ];

        imap.search(searchCriteria, (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (results.length === 0) {
            imap.end();
            return resolve({ emails: [], total: 0, query, folder });
          }

          const fetchResults = results.slice(-limit);
          const fetch = imap.fetch(fetchResults, {
            bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
            struct: true
          });

          fetch.on('message', (msg, seqno) => {
            let email = { id: seqno };

            msg.on('body', (stream, info) => {
              simpleParser(stream, (err, parsed) => {
                if (!err) {
                  email.from = parsed.from?.text || '';
                  email.to = parsed.to?.text || '';
                  email.subject = parsed.subject || '';
                  email.date = parsed.date || '';
                }
              });
            });

            msg.once('end', () => {
              emails.push(email);
            });
          });

          fetch.once('end', () => {
            imap.end();
          });
        });
      });
    });

    imap.once('error', (err) => {
      reject(err);
    });

    imap.once('end', () => {
      resolve({
        emails: emails.reverse(),
        total: emails.length,
        query: query,
        folder: folder
      });
    });

    imap.connect();
  });
}

// Kerio MCP Tools Definitions
const KERIO_TOOLS = [
  {
    name: "kerio_list_emails",
    description: "📧 Liste Emails aus Kerio Connect Postfach (INBOX oder andere Ordner)",
    input_schema: {
      type: "object",
      properties: {
        folder: {
          type: "string",
          description: "Mailbox folder (default: INBOX)",
          default: "INBOX"
        },
        limit: {
          type: "number",
          description: "Number of emails to retrieve (default: 20)",
          default: 20
        },
        unreadOnly: {
          type: "boolean",
          description: "Only show unread emails (default: false)",
          default: false
        }
      }
    }
  },
  {
    name: "kerio_read_email",
    description: "📖 Lese vollständigen Email-Inhalt (Text, HTML, Anhänge)",
    input_schema: {
      type: "object",
      properties: {
        emailId: {
          type: "number",
          description: "Email ID from list_emails"
        },
        folder: {
          type: "string",
          description: "Mailbox folder (default: INBOX)",
          default: "INBOX"
        }
      },
      required: ["emailId"]
    }
  },
  {
    name: "kerio_send_email",
    description: "✉️ Sende Email via Kerio Connect SMTP",
    input_schema: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient email address"
        },
        subject: {
          type: "string",
          description: "Email subject"
        },
        text: {
          type: "string",
          description: "Plain text body"
        },
        html: {
          type: "string",
          description: "HTML body (optional)"
        },
        cc: {
          type: "string",
          description: "CC recipients (optional)"
        },
        bcc: {
          type: "string",
          description: "BCC recipients (optional)"
        }
      },
      required: ["to", "subject"]
    }
  },
  {
    name: "kerio_search_emails",
    description: "🔍 Durchsuche Emails nach Suchbegriff (Subject oder Body)",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query"
        },
        folder: {
          type: "string",
          description: "Mailbox folder (default: INBOX)",
          default: "INBOX"
        },
        limit: {
          type: "number",
          description: "Max results (default: 50)",
          default: 50
        }
      },
      required: ["query"]
    }
  }
];

module.exports = {
  KERIO_CONFIG,
  KERIO_TOOLS,
  isKerioConfigured,
  listEmails,
  readEmail,
  sendEmail,
  searchEmails
};
