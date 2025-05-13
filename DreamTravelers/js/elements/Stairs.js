class Stairs {
    constructor(scene, grid) {
        this.scene = scene;
        this.grid = grid;
    }

    create(x, y, z, rotation = 0) {
        const key = `${x},${y},${z}`;
        
        // bloc principal
        const stairParent = this.grid.addGridElement(x, y, z, 'stair');
        const nombreMarches = 3;
        
        // bloc d'escalier complet
        for (let i = 0; i < nombreMarches; i++) {
            // dimension de chaque marche
            const hauteurMarche = 1.0 / nombreMarches;
            const profondeurMarche = 1.0 / nombreMarches;
            
            // bloc pour chaque marche
            const marche = BABYLON.MeshBuilder.CreateBox(
                `marche_${i}_${key}`,
                { 
                    width: 1, 
                    height: (i + 1) * hauteurMarche,
                    depth: profondeurMarche 
                },
                this.scene
            );
            
            marche.position = new BABYLON.Vector3(
                0, 
                ((i + 1) * hauteurMarche) / 2 - 0.5,
                (profondeurMarche / 2) - 0.5 + (i * profondeurMarche)
            );
            
            marche.parent = stairParent;
            
            // matériau
            const marcheMaterial = new BABYLON.StandardMaterial(`marcheMat_${i}_${key}`, this.scene);
            marcheMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);

            marche.material = marcheMaterial;
        }
        
        // init de la grille
        if (!this.grid.grid[key]) {
            this.grid.grid[key] = {};
        }
        
        // infos pour le pathfinding
        this.grid.grid[key].rotation = rotation;
        this.grid.grid[key].nextPosition = this.getNextPosition(x, y, z, rotation);
        this.grid.grid[key].type = 'stair';
        
        // rotation du parent
        stairParent.rotation.y = rotation * Math.PI / 2;
        
        return stairParent;
    }
    
    getNextPosition(x, y, z, rotation) {
        // position suivante selon la rotation
        switch (rotation) {
            case 0: // Nord
                return { x: x, y: y + 1, z: z - 1 };
            case 1: // Est
                return { x: x + 1, y: y + 1, z: z };
            case 2: // Sud
                return { x: x, y: y + 1, z: z + 1 };
            case 3: // Ouest
                return { x: x - 1, y: y + 1, z: z };
            default:
                return { x: x, y: y + 1, z: z - 1 };
        }
    }
} 