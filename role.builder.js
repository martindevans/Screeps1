const bt = require("behaviourtree");
const bp = require("behaviourpaths");
const act = require("actions");
const find = require("utils.find")

const tree = new bt.BehaviourTree(
    new bt.Selector([
        // Find energy to collect
        new bt.While(
            new bt.Predicate(blackboard => Game.creeps[blackboard.creep_name].store.getFreeCapacity(RESOURCE_ENERGY) > 0),
            new bt.Sequence([
                new bt.Say("Choose"),
                new bt.Selector([
                    new bt.Predicate(bb => find.adjacent_dropped_resource(bb, RESOURCE_ENERGY)),
                    new bt.Predicate(bb => find.structure_with_resource(bb, [STRUCTURE_STORAGE], RESOURCE_ENERGY, 1000)),
                    new bt.Predicate(bb => find.structure_with_resource(bb, [STRUCTURE_CONTAINER], RESOURCE_ENERGY, 1000)),
                    new bt.Predicate(bb => find.dropped_resources(bb)),
                    new bt.Predicate(bb => find.structure_with_resource(bb, [STRUCTURE_STORAGE, STRUCTURE_CONTAINER], RESOURCE_ENERGY, 75, find.Mode.Random)),
                    new bt.Predicate(bb => find.structure_with_resource(bb, [STRUCTURE_EXTENSION], RESOURCE_ENERGY, 50))
                ]),
                new bt.Say("Collect"),
                new bt.Predicate(bp.setup_pathfind_to_find_id),
                new bp.MoveTo(bb => act.pickup(bb, RESOURCE_ENERGY) != ERR_NOT_IN_RANGE),
                new bt.Repeat(
                    new bt.Predicate(bb => act.pickup(bb, RESOURCE_ENERGY) == 0)
                )
            ])
        ),

        // Build something or else upgrade
        new bt.While(
            new bt.Predicate(blackboard => Game.creeps[blackboard.creep_name].store.getUsedCapacity(RESOURCE_ENERGY) > 0),
            new bt.Selector([
                new bt.Sequence([
                    new bt.Predicate(bb => find.structure_with_space(bb, [STRUCTURE_EXTENSION], RESOURCE_ENERGY)),
                    new bt.Say("Refill"),
                    new bt.Predicate(bp.setup_pathfind_to_find_id),
                    new bp.MoveTo(do_delivery)
                ]),
                new bt.Sequence([
                    new bt.Predicate(bb => find.construction_sites(bb)),
                    new bt.Say("Build"),
                    new bt.Predicate(bp.setup_pathfind_to_find_id),
                    new bp.MoveTo(bb => act.build(bb) != ERR_NOT_IN_RANGE),
                    new bt.Repeat(
                        new bt.Predicate(bb => act.build(bb) == 0)
                    )
                ]),
                new bt.Sequence([
                    new bt.Predicate(bb => find.room_controller(bb)),
                    new bt.Say("Upgrade"),
                    new bt.Predicate(bp.setup_pathfind_to_find_id),
                    new bp.MoveTo(bb => act.upgrade(bb) != ERR_NOT_IN_RANGE),
                    new bt.Repeat(
                        new bt.Predicate(bb => act.upgrade(bb) == 0)
                    ),
                ])
            ])
        )
    ])
);

function do_delivery(blackboard)
{
    let creep = Game.creeps[blackboard.creep_name];
    let object = Game.getObjectById(blackboard.find_id);
    return creep.transfer(object, RESOURCE_ENERGY) != ERR_NOT_IN_RANGE;
}

const roleBuilder = {

    run: function(creep)
    {
        tree.tick(creep.memory.bt_state, creep.memory.bt_board);
    }
};

module.exports = roleBuilder;