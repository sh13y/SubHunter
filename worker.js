addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    // Serve static HTML page for initial load
    if (request.method === 'GET' && !new URL(request.url).searchParams.get('domain')) {
        return new Response(htmlPage(), {
            headers: { 
                'Content-Type': 'text/html',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    }

    // Handle subdomain search
    if (request.method === 'GET') {
        const url = new URL(request.url);
        const domain = url.searchParams.get('domain');

        if (!domain) {
            return new Response('❌ Error: No domain provided', { status: 400 });
        }

        try {
            // Fetch subdomains from multiple sources
            const sources = [
                `https://api.hackertarget.com/hostsearch/?q=${domain}`,
                `https://crt.sh/?q=%25.${domain}&output=json`
            ];

            const subdomainDetails = new Map();

            // Fetch subdomains from sources
            for (const apiUrl of sources) {
                const response = await fetch(apiUrl);
                if (!response.ok) continue;

                const data = await response.text();
                
                let extractedSubdomains = [];
                
                // Handle HackerTarget API response
                if (apiUrl.includes('hackertarget')) {
                    extractedSubdomains = data.split("\n")
                        .map(line => line.split(",")[0])
                        .filter(subdomain => subdomain && subdomain.includes('.'));
                }
                
                // Handle crt.sh JSON response
                if (apiUrl.includes('crt.sh')) {
                    try {
                        const jsonData = JSON.parse(data);
                        extractedSubdomains = jsonData
                            .map(entry => entry.name_value.split('\n'))
                            .flat()
                            .filter(subdomain => 
                                subdomain && 
                                subdomain.includes('.') && 
                                !subdomain.includes('*')
                            );
                    } catch (parseError) {
                        console.error('Error parsing crt.sh response:', parseError);
                    }
                }

                // Process unique subdomains
                for (const subdomain of extractedSubdomains) {
                    const cleanSubdomain = subdomain.trim().toLowerCase();
                    if (cleanSubdomain && cleanSubdomain.endsWith(domain)) {
                        if (!subdomainDetails.has(cleanSubdomain)) {
                            subdomainDetails.set(cleanSubdomain, {
                                ips: new Set(),
                                httpStatus: null,
                                serverInfo: null
                            });
                        }
                    }
                }
            }

            // Resolve IP addresses and additional info
            const ipResolvePromises = Array.from(subdomainDetails.keys()).map(async (subdomain) => {
                try {
                    // DNS lookup
                    const dnsResponse = await fetch(`https://dns.google.com/resolve?name=${subdomain}`);
                    const dnsData = await dnsResponse.json();
                    
                    // Collect IP addresses
                    if (dnsData.Answer) {
                        dnsData.Answer.forEach(answer => {
                            if (answer.type === 1) { // A record
                                subdomainDetails.get(subdomain).ips.add(answer.data);
                            }
                        });
                    }
                    
                    // HTTP Status and Server Info
                    async function fetchWithTimeout(url, options = {}, timeout = 5000) {
                        const controller = new AbortController();
                        const id = setTimeout(() => controller.abort(), timeout);
                        
                        try {
                            const response = await fetch(url, {
                                ...options,
                                signal: controller.signal
                            });
                            clearTimeout(id);
                            return response;
                        } catch (error) {
                            clearTimeout(id);
                            throw error;
                        }
                    }
                    
                    // Usage in the existing code
                    try {
                        const httpResponse = await fetchWithTimeout(`https://${subdomain}`, { 
                            method: 'HEAD',
                            redirect: 'manual'
                        });
                        
                        subdomainDetails.get(subdomain).httpStatus = httpResponse.status;
                    } catch {
                        // Fallback to HTTP if HTTPS fails
                        try {
                            const httpResponse = await fetchWithTimeout(`http://${subdomain}`, { 
                                method: 'HEAD',
                                redirect: 'manual'
                            });
                            
                            subdomainDetails.get(subdomain).httpStatus = httpResponse.status;
                        } catch {
                            // Unable to connect
                            subdomainDetails.get(subdomain).httpStatus = 'N/A';
                        }
                    }
                } catch (error) {
                    // DNS or connection error
                    console.error(`Error resolving ${subdomain}:`, error);
                }
            });

            // Wait for all IP and info resolutions
            await Promise.allSettled(ipResolvePromises);

            // Prepare table data
            const tableRows = Array.from(subdomainDetails.entries())
                .map(([subdomain, details]) => ({
                    subdomain,
                    ips: Array.from(details.ips).join(', ') || 'N/A',
                    httpStatus: details.httpStatus || 'N/A',
                    serverInfo: details.serverInfo || 'N/A'
                }))
                .sort((a, b) => a.subdomain.localeCompare(b.subdomain));

            // Generate results page
            return new Response(resultsPage(domain, tableRows), { 
                headers: { 
                    "Content-Type": "text/html",
                    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                } 
            });

        } catch (error) {
            return new Response(`❌ Error: ${error.message}`, { status: 500 });
        }
    }
}

// Static HTML page function
function htmlPage() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subdomain Finder</title>
    <link rel="icon" type="image/png" href="https://img.icons8.com/?size=100&id=RMBa11MhnZEA&format=png&color=00ff00">
    <style>
        body {
            background-color: #121212;
            color: #00ff00;
            font-family: monospace, 'Courier New';
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            line-height: 1.6;
        }
        .container {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        h1 {
            text-align: center;
            color: #00ff00;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 30px;
        }
        h1 svg {
            margin-right: 10px;
        }
        .search-wrapper {
            width: 100%;
            max-width: 500px;
        }
        input {
            width: 100%;
            padding: 15px;
            background-color: black;
            color: #00ff00;
            border: 2px solid #00ff00;
            font-family: monospace;
            font-size: 16px;
            margin-bottom: 10px;
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 15px;
            background-color: #00ff00;
            color: black;
            border: none;
            font-family: monospace;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
        }
        button:hover {
            background-color: #00cc00;
        }
        #loadingOverlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            color: #00ff00;
            z-index: 1000;
        }
        .spinner {
            border: 4px solid #00ff00;
            border-top: 4px solid #000;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        }
        footer {
            background-color: #1e1e1e;
            color: #00ff00;
            text-align: center;
            padding: 10px;
            font-size: 12px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>
        <!-- <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg> -->
            Advanced SubDomain Finder
        </h1>
        <div class="search-wrapper">
            <form id="searchForm">
                <input 
                    type="text" 
                    id="domainInput" 
                    placeholder="Enter domain (e.g., sriflix.online)" 
                    required
                >
                <button type="submit">Find Subdomains</button>
            </form>
        </div>
    </div>

    <footer>
        <div class="footer-content">
            <div class="copyright">
                © 2025 | made in ceylon with ❤️ by sh13y
            </div>
            <div class="footer-links">
                <!-- <a href="https://github.com/sh13y/Collaborative-Notepad" target="_blank">
                    <i class="fab fa-github"></i>
                    Star On GitHub
                </a>
                <a href="http://paypal.me/shieyz" target="_blank">
                    <i class="fab fa-paypal"></i>
                    Back Pain Relief Fund 🪑🤕
                </a> -->
            </div>
        </div>
    </footer>

    <div id="loadingOverlay">
        <div class="spinner"></div>
        <div style="margin-top: 15px;">Finding Subdomains...</div>
    </div>

    <script>
        document.getElementById('searchForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const domain = document.getElementById('domainInput').value;
            document.getElementById('loadingOverlay').style.display = 'flex';
            window.location.href = '?domain=' + encodeURIComponent(domain);
        });
    </script>
</body>
</html>`;
}

// Results page function
function resultsPage(domain, tableRows) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subdomain Finder Results</title>
    <link rel="icon" type="image/png" href="https://img.icons8.com/?size=100&id=RMBa11MhnZEA&format=png&color=00ff00">
    <style>
        * {
            box-sizing: border-box;
        }
        body { 
            background-color: #121212;
            color: #00ff00;
            font-family: monospace, 'Courier New';
            margin: 0;
            padding: 10px;
            line-height: 1.6; 
            width: 100%;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            background-color: #1e1e1e;
            border: 2px solid #00ff00;
            padding: 15px;
            flex-grow: 1;
        }
        input, button { 
            width: 100%; 
            padding: 10px; 
            margin-top: 10px; 
            background-color: #000;
            color: #00ff00;
            border: 1px solid #00ff00;
        }
        button { 
            background-color: #00ff00; 
            color: #000; 
            border: none; 
            cursor: pointer; 
            transition: background-color 0.3s ease; 
        }
        button:hover { 
            background-color: #00cc00; 
        }
        .table-wrapper {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            max-height: 500px; /* Limit table height */
            overflow-y: auto;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            min-width: 300px; 
        }
        th, td { 
            border: 1px solid #00ff00; 
            padding: 8px; 
            text-align: left; 
            color: #00ff00;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 150px;
        }
        th { 
            background-color: #333; 
            position: sticky;
            top: 0;
            z-index: 1;
        }
        .stats {
            margin: 10px 0;
            font-style: italic;
            color: #00ff00;
            text-align: center;
            font-size: 0.9em;
        }
        .search-again {
            display: block;
            width: 100%;
            max-width: 300px;
            margin: 15px auto;
            padding: 10px;
            background-color: #333; 
            color: #00ff00;
            text-decoration: none;
            text-align: center;
            border-radius: 5px;
            transition: background-color 0.3s ease;
            font-size: 0.9em;
        }
        .search-again:hover {
            background-color: #444;
        }
        h2 {
            text-align: center;
            color: #00ff00;
            border-bottom: 1px solid #00ff00;
            padding-bottom: 10px;
            font-size: 1.2em;
        }
        footer {
            background-color: #1e1e1e;
            color: #00ff00;
            text-align: center;
            padding: 10px;
            font-size: 0.8em;
            margin-top: 15px;
            width: 100%;
        }
        @media (max-width: 600px) {
            body {
                padding: 5px;
            }
            .container {
                padding: 10px;
            }
            table {
                font-size: 0.8em;
            }
            th, td {
                padding: 6px;
                max-width: 100px;
            }
            input, button, .search-again {
                font-size: 0.9em;
            }
            .table-wrapper {
                max-height: 300px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>🔍 Advanced Subdomain Finder</h2>
        <form method="GET">
            <input type="text" name="domain" placeholder="Enter domain (e.g., sriflix.online)" required>
            <button type="submit">Find Subdomains</button>
        </form>
        <div class="stats">Found ${tableRows.length} unique subdomains for ${domain}</div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Subdomain</th>
                        <th>IP Addresses</th>
                        <th>HTTP Status</th>
                        <th>Server Info</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows.map(row => `
                        <tr>
                            <td>${row.subdomain}</td>
                            <td>${row.ips}</td>
                            <td>${row.httpStatus}</td>
                            <td>${row.serverInfo}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <a href="/" class="search-again">🔄 Search Again</a>
    </div>
    <footer>
         © 2025 | made in ceylon with ❤️ by sh13y
    </footer>
</body>
</html>`;
}
