require("dotenv").config();

const redis = require("redis");
const client = redis.createClient();

const { toWei, fromWei } = require("web3-utils");

const {
  SENDER_PRIVATE_KEY,
  KUSD_ADDRESS,
  BUSD_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  ROUTER_ADDRESS,
  POOL_ADDRESS,
  BSC_WSS_RPC,
  ROUTERS
} = process.env;

const Web3 = require("web3");
const web3 = new Web3(BSC_WSS_RPC);

web3.eth.accounts.wallet.add(SENDER_PRIVATE_KEY);
const sender = web3.eth.accounts.wallet[0];

const { abi: kusdABI } = require("./KUSD.json");
const kusd = new web3.eth.Contract(kusdABI, KUSD_ADDRESS);

const { abi: routerABI } = require("./Router.json");
const router = new web3.eth.Contract(routerABI, ROUTER_ADDRESS);

const { abi: poolABI } = require("./Pool.json");
const { default: BigNumber } = require("bignumber.js");
const pool = new web3.eth.Contract(poolABI, POOL_ADDRESS);

const getSwapRate = async (outToken) => {
  const routers = ROUTERS.split(" ");
  let outAmount = BigNumber("0");
  for (let i=0; i< routers.length; i++) {
    try {
      let amount = await router.methods.calculateSwap(
        [routers[i]],
        [KUSD_ADDRESS],
        [outToken],
        toWei("1")
      ).call({from: sender.address});
      amount = BigNumber(amount.toString());
      if (amount.gt(outAmount)) {
        outAmount = amount;
      }
    } catch(error) {}        
  }
  return outAmount.toString();
}

const getTotalSupply = async () => {
  const totalSupply = await kusd.methods.totalSupply().call({
    from: sender.address
  });
  return totalSupply.toString();
}

const getPrice = async () => {
  const price = await kusd.methods.getSynthPrice().call({
    from: sender.address
  });
  return price.toString();
}

const main = async () => {
  web3.eth
    .subscribe("newBlockHeaders", async (error, result) => {
      if (!error) {        
        const block = await web3.eth.getBlock('latest');
        if (block.number % 10 == 0) {
          console.log("block:", block.number);
          client.set("timestamp", block.timestamp, redis.print);

          console.log("total supply:", await getTotalSupply());
          client.set("total-supply", await getTotalSupply(), redis.print);

          console.log("price:", await getPrice(), "USD");   
          client.set("usd", await getPrice(), redis.print);

          console.log("swap:", await getSwapRate(BUSD_ADDRESS), "BUSD");
          client.set("busd", await getSwapRate(BUSD_ADDRESS), redis.print);

          console.log("swap:", await getSwapRate(USDC_ADDRESS), "USDC");
          client.set("usdc", await getSwapRate(USDC_ADDRESS), redis.print);

          console.log("swap:", await getSwapRate(USDT_ADDRESS), "USDT");
          client.set("usdt", await getSwapRate(USDT_ADDRESS), redis.print);
        }
        return;
      }
      console.error(error);
    })
    .on("error", console.error);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
