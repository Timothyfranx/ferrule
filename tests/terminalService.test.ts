import { describe, it, expect } from "vitest";
import { TerminalService } from "../src/services/terminalService.js";
import { PracticeTradingService } from "../src/services/practiceTradingService.js";
import { WatcherService } from "../src/services/watcherService.js";
import type { OpenWindow } from "../src/types/index.js";

const mockWindow: OpenWindow = {
  marketId: "0x1234567890123456789012345678901234567890123456789012345678901234",
  poolAddress: "0x3333333333333333333333333333333333333333",
  asset: "BTC",
  intervalSec: 300,
  expiry: Math.floor(Date.now() / 1000) + 200,
  secondsRemaining: 200,
  upLeanPercent: 65,
  upLeanProbability: 0.65,
  bestUpBid: 0.64,
  bestUpAsk: 0.66,
  bestDownBid: 0.34,
  bestDownAsk: 0.36,
  upBidVolume: 900,
  upAskVolume: 800,
  status: "Trading",
};

describe("TerminalService — Shell & Script Interpreter", () => {
  const terminal = new TerminalService();
  const practiceService = new PracticeTradingService({ initialBankroll: 1000, maxStakePerCall: 100 });
  const watcherService = new WatcherService();

  const context = {
    mode: "practice" as const,
    setMode: () => {},
    windows: [mockWindow],
    calls: [],
    practiceService,
    realService: null,
    watcherService,
    walletAddress: "0x1111222233334444555566667777888899990000",
  };

  it("evaluates 'help' command and prints core manual", async () => {
    const lines = await terminal.executeCommand("help", context);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0].text).toContain("Ferrule Terminal Help");
    expect(lines[1].text).toContain("CORE COMMANDS");
  });

  it("evaluates 'markets' and renders tabular ASCII data", async () => {
    const lines = await terminal.executeCommand("markets", context);
    expect(lines.length).toBe(1);
    expect(lines[0].type).toBe("table");
    expect(lines[0].text).toContain("BTC/USDC");
    expect(lines[0].text).toContain("65% UP");
  });

  it("evaluates 'market status BTC' and returns depth telemetry", async () => {
    const lines = await terminal.executeCommand("market status BTC", context);
    expect(lines.length).toBe(2);
    expect(lines[1].text).toContain("CROWD LEAN: 65% UP");
    expect(lines[1].text).toContain("Best Ask: 0.660");
  });

  it("evaluates 'call BTC up 25' and records practice trade", async () => {
    const lines = await terminal.executeCommand("call BTC up 25", context);
    expect(lines.length).toBe(2);
    expect(lines[0].text).toContain("Practice call recorded successfully");
    expect(lines[1].text).toContain("STAKE: $25.00 USDso");
    expect(practiceService.getBankroll()).toBe(975);
  });

  it("evaluates 'whoami' and 'env'", async () => {
    const whoami = await terminal.executeCommand("whoami", context);
    expect(whoami[0].text).toContain("0x1111222233334444555566667777888899990000");

    const env = await terminal.executeCommand("env", context);
    expect(env[0].text).toContain("CHAIN_ID=50312");
  });

  it("lists virtual files with 'ls' and reads script with 'cat'", async () => {
    const ls = await terminal.executeCommand("ls", context);
    expect(ls[0].text).toContain("/strategies/fade_crowd.sh");

    const cat = await terminal.executeCommand("cat /strategies/fade_crowd.sh", context);
    expect(cat[0].text).toContain("Contrarian Fade Strategy");
  });

  it("spawns watcher from script with 'run /strategies/fade_crowd.sh'", async () => {
    const run = await terminal.executeCommand("run /strategies/fade_crowd.sh", context);
    expect(run.length).toBeGreaterThan(1);
    expect(run[0].text).toContain("[RUN] Executing script");
    expect(run[1].text).toContain("[INIT] Watcher spawned");
    expect(watcherService.getWatchers().length).toBeGreaterThan(0);
  });

  it("supports virtual filesystem operations: mkdir, touch, redirection, and rm", async () => {
    // 1. mkdir clob
    const mkdirRes = await terminal.executeCommand("mkdir clob", context);
    expect(mkdirRes[0].text).toContain("[FS] Directory created: /clob");

    // 2. mkdir duplicate fails
    const mkdirDup = await terminal.executeCommand("mkdir clob", context);
    expect(mkdirDup[0].type).toBe("error");

    // 3. touch /clob/custom.sh
    const touchRes = await terminal.executeCommand("touch /clob/custom.sh", context);
    expect(touchRes[0].text).toContain("[FS] File created: /clob/custom.sh");

    // 4. echo redirection >
    const redirRes = await terminal.executeCommand("echo watch BTC-300s if lean>=0.70 then suggest stake 50 up > /clob/custom.sh", context);
    expect(redirRes[0].text).toContain("[FS] Wrote output to /clob/custom.sh");

    const catRes = await terminal.executeCommand("cat /clob/custom.sh", context);
    expect(catRes[0].text).toContain("watch BTC-300s");

    // 5. rm /clob/custom.sh
    const rmRes = await terminal.executeCommand("rm /clob/custom.sh", context);
    expect(rmRes[0].text).toContain("[FS] Removed: /clob/custom.sh");

    // 6. pwd and cd
    const pwdRes = await terminal.executeCommand("pwd", context);
    expect(pwdRes[0].text).toBe("/");

    const cdRes = await terminal.executeCommand("cd clob", context);
    expect(cdRes[0].text).toBe("cwd: /clob");

    const cdBack = await terminal.executeCommand("cd ..", context);
    expect(cdBack[0].text).toBe("cwd: /");

    // 7. resetfs
    const resetRes = await terminal.executeCommand("resetfs", context);
    expect(resetRes[0].text).toContain("Virtual filesystem reset");
  });
});

