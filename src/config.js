export default {
    worker: {
        cost: 2,
        speed: 50,
        carry: 1
    },
    thief: {
        cost: 2,
        speed: 50,
        carry: 1
    },
    hub: {
        starting_size: 9
    },
    resources: {
        starting_count: 40,
        patterns: [
            [
                [0, 0],
                [0, 1],
                [0, -1],
                [1, 1],
                [1, 0]
            ],
            [
                [0, 0],
                [1, 1],
                [0, -1]
            ],
            [
                [0, 0],
                [0, 1]
            ]
        ]
    },
    height: 100,
    width: 100
}