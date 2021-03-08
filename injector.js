const chrome = require('chrome-remote-interface');
const getPort = require('get-port');
const childProcess = require('child_process');
const fs = require("fs");

const cache = [];
async function main() {
    try {
        const port = await getPort();
        const debug = [`--remote-debugging-port=${port}`]
        const proc = childProcess.spawn(fs.readFileSync("path.txt", "utf8"), debug, {
            detached: true
        });
        proc.unref();

        const script = fs.readFileSync("cheat.js", "utf8");
        const devTools = fs.readFileSync("dev-tools.js", "utf8");

        for (var i = 0; i < 10; ++i) {
            const targets = await chrome.List({
                port: port
            });
            Promise.all(targets.map(async (target) => inject(port, target, script, devTools)));
            await sleep(1700);
        }

        setInterval(function() {}, 1000);
    } catch (e) {
		console.log(e.message)
    }
}

async function inject(port, target, code, tools) {
    if (cache.includes(target.id)) {
        return;
    }

    cache.push(target.id);

    const client = await chrome({
        port: port,
        target: target
    });

    const {
        Network,
        Debugger,
        Runtime
    } = client;

    Network.enable();
    Debugger.enable();

    await Network.requestWillBeSent(async (params) => {
        if (params.request.url == "https://krunker.io/") {
            console.log(`injecting target URL: ${params.request.url} | ID: ${target.id}`);
            await Runtime.evaluate({
                expression: code
            });
            await Runtime.evaluate({
                expression: tools
            });
            console.log("listening at: http://localhost:" + port + "/");
            setInterval(function() {}, 1000);
        }
    });

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();
