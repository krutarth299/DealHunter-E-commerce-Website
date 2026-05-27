import { execSync } from 'child_process';
import net from 'net';
import logger from './logger.js';

/**
 * Utility to manage server ports, including killing existing processes
 * and finding the next available port.
 */

export const killProcessOnPort = async (port) => {
    try {
        console.log(`[PORT_CHECK] Checking port ${port}...`);
        
        let pid;
        if (process.platform === 'win32') {
            try {
                // Use a regex to find the exact port followed by a space to avoid partial matches like 5000 matching 50000
                const output = execSync(`netstat -ano | findstr :${port}`).toString();
                const lines = output.split('\n').filter(line => {
                    const parts = line.trim().split(/\s+/);
                    // parts[1] is the Local Address (e.g., 0.0.0.0:5000)
                    return parts.length > 4 && parts[1].endsWith(`:${port}`) && parts[3] === 'LISTENING';
                });
                
                if (lines.length > 0) {
                    const parts = lines[0].trim().split(/\s+/);
                    pid = parts[parts.length - 1];
                }
            } catch (e) {
                // netstat fails if no process is found
            }
        } else {
            try {
                pid = execSync(`lsof -t -i:${port}`).toString().trim();
            } catch (e) {}
        }

        if (pid) {
            console.log(`[PORT_KILL] Found process ${pid} on port ${port}. Killing...`);
            if (process.platform === 'win32') {
                execSync(`taskkill /F /PID ${pid}`);
            } else {
                execSync(`kill -9 ${pid}`);
            }
            // Wait a bit for the port to be released
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`[PORT_KILL] Process ${pid} terminated.`);
            return true;
        }
        
        console.log(`[PORT_CHECK] Port ${port} is free.`);
        return false;
    } catch (err) {
        console.error(`[PORT_ERROR] Failed to kill process on port ${port}:`, err.message);
        return false;
    }
};

export const isPortAvailable = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
};

export const getAvailablePort = async (startPort) => {
    let port = startPort;
    while (!(await isPortAvailable(port))) {
        console.log(`[PORT_SWITCH] Port ${port} is occupied. Trying ${port + 1}...`);
        port++;
        if (port > startPort + 10) {
            throw new Error('Could not find an available port within range.');
        }
    }
    return port;
};

export const setupPort = async (defaultPort = 5000) => {
    try {
        // First try to kill existing
        await killProcessOnPort(defaultPort);
        
        // Then find available (in case kill failed or something else took it)
        const finalPort = await getAvailablePort(defaultPort);
        
        if (finalPort !== defaultPort) {
            console.log(`[PORT_SWITCH] Using alternative port: ${finalPort}`);
        }
        
        return finalPort;
    } catch (err) {
        console.error('[PORT_ERROR] Port setup failed:', err.message);
        return defaultPort;
    }
};

export default { setupPort, killProcessOnPort, getAvailablePort };
