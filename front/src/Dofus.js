import React, { useEffect, useState } from 'react';
import { Button, HTMLTable, Icon, InputGroup, Popover } from "@blueprintjs/core";
import ColumnFilter from "./ColumnFilter";
import { Position } from "@blueprintjs/core/lib/esnext/common/position";
import { PopoverInteractionKind } from "@blueprintjs/core/lib/esm/components/popover/popover";
import Account from "./Account";
import { initWS } from "./utilities";
import Toaster from "./Toaster";

export default function Dofus(props) {
    const [accounts, setAccounts] = useState({});
    const [account, setAccount] = useState(null);
    const [like, setLike] = useState(localStorage['like']);
    const [liked, setLiked] = useState({});
    const [search, setSearch] = useState(
        localStorage['mySearch'] ? JSON.parse(localStorage['mySearch']) :
            ["", {
                column: {
                    "Like": true,
                    "Nom de compte": true,
                    "Alias": true,
                    "IP": true,
                    "API Key": false,
                    "Account ID": false,
                }
            }]
    );
    const [isSortedAlphabetically, setIsSortedAlphabetically] = useState(false);

    for (let i in accounts) {
        const account = accounts[i];
        if (localStorage[account['login'] + 'like']) {
            liked[account['login'] + 'like'] = true;
        }
    }

    window.accounts = accounts;
    window.setAccounts = setAccounts;
    useEffect(() => initWS(), []);

    useEffect(() => {
        localStorage['mySearch'] = JSON.stringify(search);
    }, [search]);

    // Fonction de tri par nom de compte
    function sortByAccountName(a, b) {
        const nameA = accounts[a].login.toLowerCase();
        const nameB = accounts[b].login.toLowerCase();

        if (nameA < nameB) {
            return -1;
        } else if (nameA > nameB) {
            return 1;
        } else {
            return 0;
        }
    }

    // Triez les clés du tableau accounts par nom de compte
    const accountKeys = Object.keys(accounts);
    const sortedAccountKeys = [...accountKeys];
    if (isSortedAlphabetically) {
        sortedAccountKeys.sort(sortByAccountName);
    }

    function dofusLogin(login, retro, delay) {
        const id = Date.now() + login;
        const button = document.getElementById("button_login_" + login + (retro ? "retro" : ""));
        if (!button || button.style.opacity === "0.5") return;
        button.style.opacity = "0.5";
        window.ws.send(JSON.stringify({
            id,
            body: { account: login, delay, retro },
            action: "get",
            resource: "connect"
        }));
    }

    function logAll(retro) {
        const delay = 3;
        Object.keys(accountKeys).map((login, i) => {
            const account = shouldPrint(login);
            if (account) {
                if (retro && account['retroPort']) return;
                if (!retro && account['d2Port']) return;
                dofusLogin(login, retro, delay * i);
                i++;
            }
        });
    }

    function shouldPrint(login) {
        if (login.startsWith("uuid") && login.length === 40) return;
        const account = accounts[login];
        if (props.retro && !account.retro) return;
        if (!props.retro && account.retro) return;
        if (like && !localStorage[account['login'] + 'like']) return;
        return account;
    }

    if (!accounts) return;

    function hasOneColumnFilter() {
        for (let key in search[1]) {
            if (key === "column") continue;
            if (Object.keys(search[1][key]).length) {
                return true;
            }
        }
    }

    function filterByColumns(obj) {
        const res = {};
        if (!hasOneColumnFilter()) return obj;
        for (let i in obj) {
            if (typeof obj[i] === "object") {
                for (let key in search[1]) {
                    if (search[1][key][obj[i][key]]) {
                        res[i] = obj[i];
                        break;
                    }
                }
            }
        }
        return res;
    }

    function filterBySearch(obj) {
        let res = {};
        if (typeof obj === "string" || typeof obj === "number") {
            if (String(obj).toLowerCase().includes(search[0])) {
                res = obj;
            }
        } else {
            for (let i in obj) {
                if (i.toLowerCase().includes(search[0]) || (typeof obj[i] === "string" || typeof obj[i] === "number") && String(obj[i]).toLowerCase().includes(search[0])) {
                    res[i] = obj[i];
                }
                if (typeof obj[i] === "object") {
                    for (let y in obj[i]) {
                        if (Object.keys(filterBySearch(obj[i][y])).length) {
                            res[i] = obj[i];
                        }
                    }
                }
            }
        }
        return res;
    }

    function filter(obj) {
        return filterBySearch(filterByColumns(obj));
    }

    const columns = {
        "Like": (key) => <th key={key} width="1%" onClick={() => {
            if (localStorage['like']) delete localStorage['like'];
            else localStorage['like'] = true;
            setLike(!like);
        }} className="pointer" style={{ position: "relative", fontSize: "10px" }}>
            <Icon style={{ position: "absolute", bottom: "40%" }} icon={like ? "star" : "star-empty"} />
        </th>,
        "Nom de compte": (key) => <th style={{ position: "relative" }} key={key} width="10%">
            <label style={{ position: "absolute", bottom: "40%" }}>Nom de compte</label>
        </th>,
        "Alias": (key) => <th style={{ position: "relative" }} key={key} width="10%">
            <div style={{ position: "absolute", bottom: "40%" }}>
                <Popover
                    content={
                        <ColumnFilter
                            search={search}
                            setSearch={setSearch}
                            items={accounts}
                            column={"alias"}
                        />
                    }
                    enforceFocus={true}
                    position={Position.BOTTOM}
                    interactionKind={PopoverInteractionKind.HOVER}
                >
                    <Icon intent={Object.keys(search?.[1]?.['alias'] ?? {}).length ? 'primary' : ''} size={17} icon="filter-list" />
                </Popover>
            </div>
            <label style={{ position: "absolute", bottom: "40%", left: "35px" }}>Alias</label>
        </th>,
        "IP": (key) => <th style={{ position: "relative" }} key={key} width="10%">
            <label style={{ position: "absolute", bottom: "40%" }}>IP</label>
        </th>,
        "API Key": (key) => <th style={{ position: "relative" }} key={key} width="10%">
            <label style={{ position: "absolute", bottom: "40%" }}>API Key</label>
        </th>,
        "Account ID": (key) => <th style={{ position: "relative" }} key={key} width="10%">
            <label style={{ position: "absolute", bottom: "40%" }}>Account ID</label>
        </th>
    };

    function classicRow(key, account, onClick, text) {
        return <td key={key} onClick={onClick}>{text}</td>
    }

    const rows = {
        "Like": (key, account) => {
            return <td key={key} onClick={() => {
                if (!localStorage[account['login'] + 'like']) {
                    localStorage[account['login'] + 'like'] = true;
                    liked[account['login'] + 'like'] = true;
                } else {
                    delete localStorage[account['login'] + 'like'];
                    delete liked[account['login'] + 'like'];
                }
                setLiked({ ...liked });
            }} style={{ fontSize: "9px", textAlign: "left" }}>
                <Icon icon={liked[account['login'] + 'like'] ? "star" : "star-empty"} />
            </td>;
        },
        "Nom de compte": (key, account, onClick) => classicRow(key, account, onClick, account['login']),
        "Alias": (key, account, onClick) => classicRow(key, account, onClick, account['alias']),
        "IP": (key, account, onClick) => classicRow(key, account, onClick, account['proxy'] ? account['proxy']['hostname'] : (account['localAddress'] || "ip par défaut")),
        "API Key": (key, account, onClick) => classicRow(key, account, onClick, account['key']),
        "Account ID": (key, account, onClick) => classicRow(key, account, onClick, account['accountId']),
    };

    return (
        <div style={{ paddingTop: "10px" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
                <Button text={"Ajouter un compte"} icon={"add"} onClick={() => {
                    Toaster.show({ message: "Bientôt disponible", intent: "danger" });
                }} />
                <InputGroup
                    style={{ width: "800px" }}
                    placeholder={"Recherche"}
                    onChange={(e) => {
                        search[0] = e.target.value;
                        setSearch([...search]);
                    }}
                    value={search[0]}
                />
                <Button text={isSortedAlphabetically ? "Désactiver le tri" : "Activer le tri alphabétique"} onClick={() => setIsSortedAlphabetically(!isSortedAlphabetically)} />
                <Button text={"Vider le cache"} icon={"trash"} onClick={() => {
                    for (let i in localStorage) delete localStorage[i];
                    window.location = window.location.href;
                }} />
            </div>
            <br />
            <HTMLTable striped bordered interactive style={{ marginTop: "5px", marginBottom: "5px", width: '100%' }}>
                <thead>
                    <tr>
                        {Object.keys(columns).map((column, i) => {
                            if (search[1].column[column]) return columns[column](i);
                        })}
                        <th width="10%">
                            <div style={{ display: "flex" }}>
                                <img onClick={() => logAll(true)} src={"/img/retroicon.png"} style={{ height: "40px" }}
                                    alt={""} />
                                &nbsp;
                                <img onClick={() => logAll()} src={"/img/dofusicon.png"} style={{ height: "40px" }}
                                    alt={""} />
                                &nbsp;
                            </div>
                        </th>
                        <th width="0.01%">
                            <Popover
                                content={
                                    <ColumnFilter
                                        search={search}
                                        setSearch={setSearch}
                                        items={accounts}
                                        column={"column"}
                                        possibilities={Object.keys(columns)}
                                    />
                                }
                                enforceFocus={true}
                                position={Position.BOTTOM}
                                interactionKind={PopoverInteractionKind.HOVER}
                            >
                                <div style={{ transform: "rotate(90deg)" }}>
                                    <Icon size={15} icon="more" />
                                </div>
                            </Popover>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sortedAccountKeys.map((login, i) => {
                        const account = shouldPrint(login);
                        if (!account) return;
                        const onClick = () => setAccount(account);
                        return (
                            <tr key={i}>
                                {Object.keys(rows).map((column, i) => {
                                    if (search[1].column[column]) return rows[column](i, account, onClick);
                                })}
                                <td>
                                    &nbsp;
                                    <img
                                        id={"button_login_" + login + "retro"}
                                        src={"/img/retroicon.png"}
                                        style={{ height: "30px", opacity: account['retroPort'] ? "0.5" : "1" }}
                                        alt={""}
                                        onClick={() => dofusLogin(login, true)}
                                    />
                                    &nbsp;&nbsp;&nbsp;&nbsp;
                                    <img
                                        id={"button_login_" + login}
                                        src={"/img/dofusicon.png"}
                                        style={{ height: "30px", opacity: account['d2Port'] ? "0.5" : "1" }}
                                        alt={""}
                                        onClick={() => dofusLogin(login, false)}
                                    />
                                </td>
                                <td />
                            </tr>)
                    })}
                </tbody>
            </HTMLTable>
            <Account setAccount={setAccount} account={account} />
        </div>
    );
}
