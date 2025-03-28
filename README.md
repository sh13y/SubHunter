# 🕵️ SubHunter: Your Friendly Neighborhood Subdomain Stalker 🕸️

![SubHunter Screenshot](Screenshot%202025-03-28%20215133.png)

## 🚀 What is SubHunter?

Imagine if Sherlock Holmes went digital and decided to hunt down subdomains instead of criminals. That's SubHunter! 🕵️🔦

A tool so nosy, it makes your grandma's neighborhood watch look like amateurs. We find subdomains faster than you can say "DNS resolution"!

## 🔍 How the Digital Magic Happens

### 1. The Great Subdomain Gathering
```javascript
const sources = [
    `https://api.hackertarget.com/hostsearch/?q=${domain}`,
    `https://crt.sh/?q=%25.${domain}&output=json`
];
```
Think of this like a digital party invitation list. We're not just knocking on the main door, we're finding ALL the secret entrances! 🚪🕲️

### 2. DNS Resolution: The IP Whisperer
```javascript
const dnsResponse = await fetch(`https://dns.google.com/resolve?name=${subdomain}`);
const dnsData = await dnsResponse.json();

// Collecting IP addresses
if (dnsData.Answer) {
    dnsData.Answer.forEach(answer => {
        if (answer.type === 1) { // A record
            subdomainDetails.get(subdomain).ips.add(answer.data);
        }
    });
}
```
We're basically the GPS for internet addresses. "Hey Google, where does THIS subdomain live?" 🛏️📍

### 3. HTTP Status Check: The Digital Bouncer
```javascript
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
        subdomainDetails.get(subdomain).httpStatus = 'N/A';
    }
}
```
We check if subdomains are alive or just digital zombies. "You shall not pass!" 🚧🧙‍♂️

## 🌟 Features That'll Make Hackers Giggle

- 📡 Subdomain hunting so thorough, it's almost creepy
- 🌐 IP resolution faster than your internet connection
- 🚦 HTTP status checking with attitude
- 🎨 UI so cool, it makes The Matrix look boring

## 🚨 Disclaimer: With Great Power Comes Great Responsibility

SubHunter is for:
- Ethical hackers
- Cybersecurity nerds
- People who think "404" is a personality trait
- NOT for causing digital mischief! 🧕💕

**Pro Tip:** Just because you CAN scan a domain doesn't mean you SHOULD. Ask for permission, or risk becoming everyone's least favorite party guest! 🎉🚫

## 🤝 Wanna Contribute?

Got ideas to make SubHunter even more awesome?
- Fork the repo
- Create a branch
- Commit your digital wizardry
- Open a pull request faster than you can say "recursive DNS"

## 💡 Learn While You Hunt

This project is basically a masterclass in:
- Web API gymnastics
- Async JavaScript ninja moves
- DNS resolution dark arts
- How to look cool while coding 😎

## 🏆 Crafted With Love (and Caffeine)

Made in Ceylon by [@sh13y](https://github.com/yourusername)
- Powered by ☕ and an unhealthy amount of curiosity
- Fueled by the spirit of digital adventure

## 🐜 License

WTFPL (Because sharing is caring, and lawyers are expensive) 💸

## 🌈 Parting Wisdom

Remember: In the world of SubHunter, every subdomain has a story. We're just here to read it! 🕵️📚

**Star this repo if it saved you hours of manual searching!** ⭐

