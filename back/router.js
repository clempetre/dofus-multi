const fs = require('fs'),
    os = require('os'),
    path = require('path'),
    {v4: uuidv4} = require('uuid'),
    u = require('./utilities'),
    wss = require('./wss'),
    fake = require('./fake'),
    accounts = require('./accounts'),
    c = require('./constants'),
    dofus = require('./dofus'),
    router = {};

module.exports = router;

router['files'] = {};

function loadFiles(dirPath) {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);
    for (let f in files) {
        const filePath = path.join(dirPath, files[f]);
        if (fs.lstatSync(filePath).isDirectory()) loadFiles(filePath + "/");
        else router['files'][files[f]] = fs.readFileSync(filePath);
    }
}

loadFiles(path.join(__dirname, './build'));

function getInterfaces() {
    const interfaces = os.networkInterfaces();
    const res = [], addresses = [];
    Object.keys(interfaces).forEach(function (name) {
        let alias = 0;
        if (name.toLowerCase().includes("vmware") || name.toLowerCase().includes("virtual") || name.toLowerCase().includes("qemu")) return;
        interfaces[name].forEach(function (_interface) {
            if ('IPv4' !== _interface.family || _interface.internal !== false || _interface.address.startsWith("192.168")) return;
            if (!alias) {
                res.push({name, _interface});
                addresses.push(_interface.address);
            }
            ++alias;
        });
    });
    c.addresses = addresses;
    return res;
}

getInterfaces();

router['get-interfaces'] = async (p) => {
    p.cb(false, getInterfaces())
};

router['get-account'] = async (p) => {
    p.cb(false, accounts[p.body.login])
};

router['get-accounts'] = async (p) => {
    p.cb(false, accounts)
};

router['post-account'] = async (p) => {
    const {accountId} = p.body;
    if (!accounts[accountId].added) {
        delete p.body['key'];
        delete p.body['refreshToken'];
    }
    if (p.body.proxy) p.body.localAddress = undefined;
    accounts[accountId] = {...accounts[accountId], ...p.body};
    u.saveAccount(accountId);
    wss.broadcast({resource: "accounts", key: accountId, value: accounts[accountId]});
    p.cb(false)
};

router['get-connect'] = async (p) => {
    const {account, delay, retro} = p.body;
    if (accounts[account].localAddress && !c.addresses.includes(accounts[account].localAddress)) return p.cb(true, "Téléphone non branché");
    if (retro) return p.cb(true, "Retro multi is almost ready :)");
    if (retro && process.platform !== "win32") return p.cb(true, "Retro multi doesn't work on linux / mac :(");
    if (delay) await u.wait(delay * 1000);
    const uuid = uuidv4();
    accounts[account].uuid = uuid;
    accounts["uuid" + uuid] = account;
    fake(account, uuid).then(async (res) => {
        if (!res) {
            c.port++;
            const port = 8101 + c.port;
            await dofus.start(accounts[account], port, retro);
            accounts[account][retro ? 'retroPort' : 'd2Port'] = port;
            wss.broadcast({resource: "accounts", key: account, value: accounts[account]});
        }
        p.cb(res !== undefined, res ? "Une erreur est survenue" : "");
    }).catch((e) => {
        console.log(e);
        p.cb(true);
    });
};