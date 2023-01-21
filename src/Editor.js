import * as React from 'react';

import GridLayout from 'react-grid-layout';

import '/node_modules/react-grid-layout/css/styles.css'
import '/node_modules/react-resizable/css/styles.css'


export default function Editor() {


    let matrix2 = [
        [1, 1, 1, 2, null, 1, 2],
        [1, 2, null, null, null, 1],
        [1, null, null, 1, 1, 2, null, 1],
        [1, 1, 1, 1, 1, null, null, 1],
        [1, 1, 1, 1, 1, 1, 1, 1]
    ];

    const layout = matrix2.map((row, i) => {
        return row.map((col, j) => {
            return {
                i: `${i}-${j}`,
                x: j,
                y: i,
                w: matrix2[i][j],
                h: matrix2[i][j],
                isResizable: false,
            }
        })
    }).flat().filter((item) => item.w !== null);

    console.log(layout);

    function convertLayoutToMatrix(layout) {
        let matrix = [];
        layout.forEach((item) => {
            if (!matrix[item.y]) {
                matrix[item.y] = [];
            }
            matrix[item.y][item.x] = item.w;
        });
        console.log("New : ", matrix);
        return matrix;
    }

    return (
        <div>
            <GridLayout
                className="layout"
                layout={layout}
                cols={8}
                rowHeight={100}
                width={1000}
                onLayoutChange={(layout) => convertLayoutToMatrix(layout)}
            >
                {layout.map((item, i) => {
                    return (
                        <div key={item.i} style={{ backgroundColor: 'grey' }}>
                            {item.i}
                        </div>
                    )
                })}

            </GridLayout>
        </div>
    );
}
