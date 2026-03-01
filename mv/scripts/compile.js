#!/usr/bin/env node
/**
 * Offline Solidity compiler using the bundled solcjs (0.8.26).
 * Produces Hardhat-compatible artifacts so tests can load them via ethers.getContractFactory().
 */
const solc = require("solc");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CONTRACTS_DIR = path.resolve(__dirname, "..", "contracts");
const ARTIFACTS_DIR = path.resolve(__dirname, "..", "artifacts", "contracts");

function findImports(importPath) {
  const full = path.resolve(CONTRACTS_DIR, importPath);
  if (fs.existsSync(full)) {
    return { contents: fs.readFileSync(full, "utf8") };
  }
  return { error: `File not found: ${importPath}` };
}

// Collect all .sol files
const solFiles = fs.readdirSync(CONTRACTS_DIR).filter((f) => f.endsWith(".sol"));

const sources = {};
for (const file of solFiles) {
  sources[file] = { content: fs.readFileSync(path.join(CONTRACTS_DIR, file), "utf8") };
}

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "evm.methodIdentifiers"],
        "": ["ast"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

let hasError = false;
if (output.errors) {
  for (const err of output.errors) {
    if (err.severity === "error") {
      console.error(err.formattedMessage);
      hasError = true;
    } else {
      console.warn(err.formattedMessage);
    }
  }
}
if (hasError) process.exit(1);

// Write Hardhat-compatible artifacts
for (const [fileName, fileContracts] of Object.entries(output.contracts || {})) {
  for (const [contractName, data] of Object.entries(fileContracts)) {
    const dir = path.join(ARTIFACTS_DIR, fileName);
    fs.mkdirSync(dir, { recursive: true });

    const artifact = {
      _format: "hh-sol-artifact-1",
      contractName,
      sourceName: `contracts/${fileName}`,
      abi: data.abi,
      bytecode: "0x" + data.evm.bytecode.object,
      deployedBytecode: "0x" + data.evm.deployedBytecode.object,
      linkReferences: {},
      deployedLinkReferences: {},
    };

    fs.writeFileSync(path.join(dir, `${contractName}.json`), JSON.stringify(artifact, null, 2));

    // Debug file (for hardhat artifact resolution)
    const dbg = {
      _format: "hh-sol-dbg-1",
      buildInfo: `../../build-info/${contractName}.json`,
    };
    fs.writeFileSync(path.join(dir, `${contractName}.dbg.json`), JSON.stringify(dbg, null, 2));

    console.log(`  ✓ ${contractName} (${data.evm.bytecode.object.length / 2} bytes)`);
  }
}

// Write build-info (required by hardhat)
const buildInfoDir = path.join(ARTIFACTS_DIR, "..", "build-info");
fs.mkdirSync(buildInfoDir, { recursive: true });
const buildId = crypto.randomBytes(16).toString("hex");
const buildInfo = {
  _format: "hh-sol-build-info-1",
  id: buildId,
  solcVersion: "0.8.26",
  solcLongVersion: solc.version(),
  input,
  output,
};
// Write per-contract build info
for (const [fileName, fileContracts] of Object.entries(output.contracts || {})) {
  for (const contractName of Object.keys(fileContracts)) {
    fs.writeFileSync(
      path.join(buildInfoDir, `${contractName}.json`),
      JSON.stringify(buildInfo, null, 2)
    );
  }
}

console.log("\nCompilation complete.");
