require("dotenv").config();

const redis = require("redis");
const client = redis.createClient();

const { toWei } = require("web3-utils");
const { default: BigNumber } = require("bignumber.js");

const {
  SENDER_PRIVATE_KEY,
  KUSD_ADDRESS,
  BUSD_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  ROUTER_ADDRESS,
  POOL_ADDRESS,
  CONTROLLER_ADDRESS,
  RESERVE_ADDRESS,
  BSC_WSS_RPC,
  ROUTERS
} = process.env;

const options = {
  // Enable auto reconnection
  reconnect: {
      auto: true,
      delay: 5000, // ms
      maxAttempts: 5,
      onTimeout: false
  }
};

const Web3 = require("web3");
const wss = new Web3.providers.WebsocketProvider(BSC_WSS_RPC, options) 
const web3 = new Web3(wss);

web3.eth.accounts.wallet.add(SENDER_PRIVATE_KEY);
const sender = web3.eth.accounts.wallet[0];

const { abi: kusdABI } = require("./KUSD.json");
const kusd = new web3.eth.Contract(kusdABI, KUSD_ADDRESS);

const { abi: routerABI } = require("./Router.json");
const router = new web3.eth.Contract(routerABI, ROUTER_ADDRESS);

const { abi: controllerABI } = require("./Controller.json");
const controller = new web3.eth.Contract(controllerABI, CONTROLLER_ADDRESS);

const { abi: reserveABI } = require("./Reserve.json");
const reserve = new web3.eth.Contract(reserveABI, RESERVE_ADDRESS);

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

const getCollateralRatio = async () => {
  const collateralRatio = await reserve.methods.globalCollateralRatio().call({
    from: sender.address
  });
  return collateralRatio.toString();
}

const getGrowthRatio = async () => {
  const growthRatio = await controller.methods.growthRatio().call({
    from: sender.address
  });
  return growthRatio.toString();
}

const main = async () => {
  web3.eth
    .subscribe("newBlockHeaders", async (error, result) => {
      if (!error) {        
        const block = await web3.eth.getBlock('latest');
        console.log(block.number);
        if (block.number % 10 == 0) {
          client.set("timestamp", block.timestamp, redis.print);
          client.set("total-supply", await getTotalSupply(), redis.print);
          client.set("usd", await getPrice(), redis.print);
          client.set("busd", await getSwapRate(BUSD_ADDRESS), redis.print);
          client.set("usdc", await getSwapRate(USDC_ADDRESS), redis.print);
          client.set("usdt", await getSwapRate(USDT_ADDRESS), redis.print);
          client.set("collateral-ratio", await getCollateralRatio());
          client.set("growth-ratio", await getGrowthRatio());
        }
        return;
      }
      console.error(error);
    })
    .on("error", console.error);
};

main()
