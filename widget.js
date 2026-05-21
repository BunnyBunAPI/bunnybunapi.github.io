(function() {
    // 1. Create the main widget container element
    const container = document.createElement('div');
    container.className = 'bunnybun-container';
    container.style = "font-family: 'Khmer Sangam MN', -apple-system, sans-serif; max-width: 500px; padding: 25px; border: 1px solid rgba(0,0,0,0.05); border-radius: 12px; background: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05); margin: 20px auto; text-align: left;";

    // 2. Inject BunnyBun custom UI elements
    container.innerHTML = `
        <h3 style="margin-top: 0; margin-bottom: 6px; color: #000000; font-size: 18px; font-weight: 700; font-family: 'Khmer Sangam MN', sans-serif;">BunnyBun Registry Engine</h3>
        <p style="margin: 0 0 15px 0; color: #475569; font-size: 13px; font-family: 'Khmer Sangam MN', sans-serif;">Real-time Porkbun registration details running 100% serverless.</p>
        <div style="display: flex; gap: 8px; margin-bottom: 15px;">
            <input type="text" id="bunnyInput" placeholder="Enter domain (e.g., porkbun.com)" style="flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 15px; outline: none; box-sizing: border-box; color: #000000; font-family: 'Khmer Sangam MN', sans-serif;">
            <button id="bunnyBtn" style="padding: 12px 24px; background: #000000; color: #ffffff; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background 0.2s; font-family: 'Khmer Sangam MN', sans-serif;">Search</button>
        </div>
        <div id="bunnyLoader" style="display: none; color: #000000; font-style: italic; font-size: 14px; margin-bottom: 10px; font-family: 'Khmer Sangam MN', sans-serif;">Querying Porkbun nodes...</div>
        <div id="bunnyError" style="display: none; color: #ef4444; background: #fef2f2; padding: 12px; border-radius: 6px; font-size: 14px; margin-bottom: 10px; border: 1px solid #fee2e2; line-height: 1.4; font-family: 'Khmer Sangam MN', sans-serif;"></div>
        <div id="bunnyCard" style="display: none; background: #f8fafc; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid #000000;">
            <h4 id="bunnyOutDomain" style="margin: 0 0 12px 0; text-transform: uppercase; color: #000000; font-size: 15px; letter-spacing: 0.5px; font-weight: 700; font-family: 'Khmer Sangam MN', sans-serif;"></h4>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: #000000; font-family: 'Khmer Sangam MN', sans-serif;">
                <p style="margin: 0;"><strong>Registrar:</strong> <span id="bunnyOutRegistrar" style="color: #000000;"></span></p>
                <p style="margin: 0;"><strong>Created On:</strong> <span id="bunnyOutCreated" style="color: #000000;"></span></p>
                <p style="margin: 0;"><strong>Expires On:</strong> <span id="bunnyOutExpires" style="color: #000000;"></span></p>
                <p style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>Nameservers:</strong> <span id="bunnyOutNS" style="color: #000000; font-size: 13px;"></span></p>
            </div>
        </div>
    `;

    const currentScript = document.currentScript;
    currentScript.parentNode.insertBefore(container, currentScript);

    const searchBtn = document.getElementById('bunnyBtn');
    searchBtn.addEventListener('click', async () => {
        const input = document.getElementById('bunnyInput').value;
        const loader = document.getElementById('bunnyLoader');
        const errorBox = document.getElementById('bunnyError');
        const card = document.getElementById('bunnyCard');
        
        loader.style.display = 'block';
        errorBox.style.display = 'none';
        card.style.display = 'none';

        if (!input) {
            loader.style.display = 'none';
            errorBox.innerText = 'Please enter a valid domain name.';
            errorBox.style.display = 'block';
            return;
        }

        const cleanDomain = input.replace(/^(https?:\/\/)?(www\.)?/, '').trim().toLowerCase().replace(/\/.*$/, '');
        
        // This connects right to the public cross-origin serverless database bridge
        const targetUrl = `https://rdap.org{cleanDomain}`;
        const proxyUrl = `https://allorigins.win{encodeURIComponent(targetUrl)}`;

        try {
            const response = await fetch(proxyUrl);
            const proxyPayload = await response.json();
            const data = JSON.parse(proxyPayload.contents);
            
            if (data.errorCode === 404 || data.title === "Not Found") {
                loader.style.display = 'none';
                errorBox.innerText = `🎉 "${cleanDomain}" is unregistered and available!`;
                errorBox.style.color = '#15803d';
                errorBox.style.background = '#f0fdf4';
                errorBox.style.borderColor = '#bbf7d0';
                errorBox.style.display = 'block';
                return;
            }

            const events = data.events || [];
            const createdEvent = events.find(e => e.eventAction === 'registration');
            const expiryEvent = events.find(e => e.eventAction === 'expiration');
            const entities = data.entities || [];
            const registrarEntity = entities.find(e => e.roles && e.roles.includes('registrar'));
            
            let registrarName = 'Porkbun / Protected';
            if (registrarEntity && registrarEntity.vcardArray) {
                const fnRow = registrarEntity.vcardArray.find(prop => prop === 'fn');
                if (fnRow) registrarName = fnRow;
            }

            document.getElementById('bunnyOutDomain').innerText = cleanDomain;
            document.getElementById('bunnyOutRegistrar').innerText = registrarName;
            document.getElementById('bunnyOutCreated').innerText = createdEvent ? new Date(createdEvent.eventDate).toLocaleDateString() : 'N/A';
            document.getElementById('bunnyOutExpires').innerText = expiryEvent ? new Date(expiryEvent.eventDate).toLocaleDateString() : 'N/A';
            document.getElementById('bunnyOutNS').innerText = data.nameservers ? data.nameservers.map(ns => ns.ldhName).join(', ') : 'None';
            
            loader.style.display = 'none';
            card.style.display = 'block';
        } catch (err) {
            loader.style.display = 'none';
            errorBox.innerText = 'Unable to pull database records. Make sure the domain name spelling is correct.';
            errorBox.style.display = 'block';
        }
    });
})();
