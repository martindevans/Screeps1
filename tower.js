var towers =
{
    run: function()
    {
        for (idx in Game.rooms)
        {
            let room = Game.rooms[idx];
            run_room(room);
        }
	}
};

function run_room(room)
{
    if (!room) {
        return;
    }

    if (!room.memory.tower_boards) {
        room.memory.tower_boards = {}
    }

    towers = room.find(FIND_MY_STRUCTURES, {
        filter: { structureType: STRUCTURE_TOWER }
    });

    _.forEach(towers, function(tower)
    {
        if (!room.memory.tower_boards[tower.id]) {
            room.memory.tower_boards[tower.id] = {
                rand_seed: Math.random()
            };
        }

        // Each tower gets a random threshold factor (0.5 to 1) which determines how damaged something must be before this tower repairs it.
        // This prevents multiple towers overhealing buildings.
        let thresholdFactor = room.memory.tower_boards[tower.id].rand_seed * 0.5 + 0.5;

        let hostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (hostile != null) {
            tower.attack(hostile);
            return;
        }

        let injured = tower.room.find(FIND_MY_CREEPS, {
            filter: (creep) => creep.hits < creep.hitsMax
        });
        if (injured.length > 0) {
            tower.heal(injured[Math.floor(Math.random()*injured.length)]);
            return;
        }

        // Do not do anything else if energy is low
        let towerEnergy = tower.store[RESOURCE_ENERGY];
        let towerEnergyCap = tower.store.getCapacity(RESOURCE_ENERGY);
        if (towerEnergy < towerEnergyCap * 0.15) {
            return;
        }

        let wall_threshold = choose_wall_threshold(tower) * thresholdFactor;
        let structures = tower.room.find(FIND_STRUCTURES, {
            filter: (structure) =>
                ((structure.structureType == STRUCTURE_WALL || structure.structureType == STRUCTURE_RAMPART) && structure.hits < structure.hitsMax * wall_threshold) ||
                (structure.structureType != STRUCTURE_WALL && structure.structureType != STRUCTURE_RAMPART && structure.hits < structure.hitsMax * thresholdFactor)
        });

        if (structures.length == 0) {
            return;
        }

        let item = structures[Math.floor(Math.random()*structures.length)];
        if (item != null)
        {
            tower.repair(item);
            return;
        }
    });
}

function choose_wall_threshold(tower)
{
    const defaultAmount = 0.00125;

    var targets = tower.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return (structure.structureType == STRUCTURE_STORAGE)
                && structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
    });

    if (targets.length == 0) {
        return defaultAmount;
    }

    let storage = targets[0];
    let capacity = storage.store.getCapacity(RESOURCE_ENERGY);
    let energy = storage.store.getUsedCapacity(RESOURCE_ENERGY);

    if (energy > capacity * 0.05) {
        return Math.pow(energy / capacity, 2);
    }

    return defaultAmount;
}

module.exports = towers;