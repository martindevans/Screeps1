const trade_cooldown = 60;

function trade(room)
{
    // Disable trading while it's giving out infinite money
    return;

    // Can't trade if there's no terminal
    if (!room.terminal) {
        return;
    }

    // Initialise import/export
    let memory = room.memory.bt_board;
    memory.imports = memory.imports || [];
    memory.exports = memory.exports || [];

    // Only trade occasionally (slightly randomised)
    if (!("trade_cooldown" in memory)) {
        memory.trade_cooldown = 10;
        return;
    }
    if (memory.trade_cooldown > 0) {
        memory.trade_cooldown--;
        return;
    }
    memory.trade_cooldown = trade_cooldown + Math.random() * trade_cooldown;

    // Try to execute a trade for each exported resource which is in the terminal
    for (let idx in memory.exports)
    {
        let res = memory.exports[idx];
        let amount = room.terminal.store.getUsedCapacity(res);
        if (amount < 100) {
            continue;
        }

        let orders = Game.market.getAllOrders({type: ORDER_BUY, resourceType: res});
        if (orders.length == 0) {
            continue;
        }

        let best_deal = _.chain(orders)
            .map(o => { return { order: o, profit: profit(room, o, amount) } })
            .reduce((a, b) => a.profit > b.profit ? a : b)
            .value();

        console.log("EXECUTING TRADE! " + JSON.stringify(best_deal));
        let result = Game.market.deal(best_deal.order.id, Math.min(best_deal.order.remainingAmount, amount), room.name);
        console.log("TRADE_RESULT: " + result);
    }
}

function profit(room, order, amount)
{
    amount = Math.min(order.remainingAmount, amount);

    // Calculate income (in credits)
    let income = amount * order.price;

    // Calculate transfer fees (in energy)
    let transfer_fees = Game.market.calcTransactionCost(amount, room.name, order.roomName);

    //todo: this assumes the price of a unit of energy is 1 credit!
    return income - transfer_fees;
}

module.exports = {
    trade: trade,
}