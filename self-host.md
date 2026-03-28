# Self-Hosting Lithic

Lithic is built entirely on TiddlyWiki, which means the app and your data are bundled together in a single, monolithic HTML file. Because of this, Lithic does not require a complex Node.js backend or database to be self-hosted. 

Instead, Lithic leverages TiddlyWiki's native **WebDAV saver**. By simply placing your Lithic HTML file on a WebDAV server, the app will automatically fire HTTP `PUT` requests to save your notes directly back to your server's filesystem whenever you make a change.

Here is how to deploy Lithic in a homelab environment.

## 1. Prepare Your Data Directory

First, create a directory on your server to hold your Lithic instances, and navigate into it. (For native Linux setups, do this in a standard location like `/opt` or your home folder).

```bash
mkdir ~/lithic-data
cd ~/lithic-data
```

## 2. Download Lithic

Download the latest version of Lithic into your new directory. 

If you want to run multiple, separate wikis (e.g., one for personal notes, one for work), you don't need a complex manager. Simply download the file multiple times and rename it for each instance using the lowercase `-o` flag:

```bash
# Download a general instance
curl -O https://lithic.uk/src/lithic.html

# Download additional instances as needed
curl -o personal.html https://lithic.uk/src/lithic.html
curl -o work.html [https://lithic.uk/src/lithic.html
```

## 3. Start the WebDAV Server

You can serve this directory using any WebDAV-compatible server. Choose the method below that best fits your infrastructure.

### Method A: Native Linux / Proxmox LXC 
If you are running a Proxmox LXC (Debian/Ubuntu) and want to avoid nested containers, you can install `rclone` natively and run it as a background system service.

1. **Install rclone:**
   ```bash
   sudo apt update && sudo apt install rclone -y
   ```
2. **Create a systemd service file:**
   ```bash
   sudo nano /etc/systemd/system/lithic-webdav.service
   ```
3. **Paste the following configuration** (ensure you replace `yourusername` with your actual Linux user, and verify the path to `lithic-data`):
   ```ini
   [Unit]
   Description=Lithic WebDAV Server
   After=network.target

   [Service]
   Type=simple
   User=yourusername
   ExecStart=/usr/bin/rclone serve webdav /home/yourusername/lithic-data --addr :8080
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
4. **Enable and start the service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now lithic-webdav
   ```

### Method B: Using Docker
If you prefer containerized services, use the lightweight `rclone` image:
```bash
docker run -d --name lithic-webdav --restart unless-stopped -p 8080:8080 -v "$(pwd):/data" rclone/rclone:latest serve webdav /data --addr :8080
```

### Method C: Using Podman (Rootless)
For rootless Podman, include the `:Z` flag for SELinux permissions and `--userns=keep-id` to map host users correctly:
```bash
podman run -d --name lithic-webdav -p 8080:8080 --userns=keep-id -v "$(pwd):/data:Z" docker.io/rclone/rclone:latest serve webdav /data --addr :8080
```

---

## 4. Access Your Wiki

Once your server or proxy is running, open your web browser and navigate to your deployed URL or local IP:
**`http://YOUR_SERVER_IP:8080/lithic.html`**
*(Or `/personal.html`, `/work.html`, etc.)*

Any changes you make and save in the browser will be written directly to the corresponding HTML file on your server.
