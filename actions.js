function build(blackboard)
{
    let creep = Game.creeps[blackboard.creep_name];
    let object = Game.getObjectById(blackboard.find_id);
    let result = creep.build(object);
    return result;
}

function upgrade(blackboard)
{
    let creep = Game.creeps[blackboard.creep_name];
    let object = Game.getObjectById(blackboard.find_id);
    let result = creep.upgradeController(object);
    return result;
}

function pickup(blackboard, resource)
{
    let creep = Game.creeps[blackboard.creep_name];
    let object = Game.getObjectById(blackboard.find_id);

    if (blackboard.pickup_type == "pickup")
    {
        let result = creep.pickup(object);
        return result;
    }
    else
    {
        if (resource == null) {
            for (var key in object.store) {
                return creep.withdraw(object, key);
            }
        }
        else
        {
            let result = creep.withdraw(object, resource);
            return result;
        }
    }
}

function drop(blackboard, resource)
{
    let creep = Game.creeps[blackboard.creep_name];
    creep.drop(resource);
    return true;
}

function suicide(blackboard)
{
    let creep = Game.creeps[blackboard.creep_name];
    if (!creep) {
        return false;
    }

    creep.suicide();
    return true;
}

function harvest(blackboard)
{
    let creep = Game.creeps[blackboard.creep_name];
    let source = Game.getObjectById(blackboard.find_id);

    if (source.pos.x < creep.pos.x - 1 || source.pos.x > creep.pos.x + 1) {
        return false;
    }
    if (source.pos.y < creep.pos.y - 1 || source.pos.y > creep.pos.y + 1) {
        return false;
    }

    let result = creep.harvest(source);
    if (result == 0) {
        return true;
    }

    return false;
}

module.exports = {
    build,
    upgrade,
    pickup,
    drop,
    suicide,
    harvest
};