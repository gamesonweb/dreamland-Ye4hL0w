class Grid {
    constructor(scene) {
        this.scene = scene;
        this.grid = {};
        this.gridSize = 10;
    }

    // ajout d'un élément à la grille
    addGridElement(x, y, z, type = 'cube', parent = null) {
        const key = `${x},${y},${z}`;
        
        // vérifier si la position est déjà occupée
        if (this.grid[key]) {
            console.warn(`Un élément existe déjà à la position (${x}, ${y}, ${z})`);
            return this.grid[key].mesh;
        }
        
        let mesh;
        const position = new BABYLON.Vector3(x, y, z);
        
        if (type === 'cube') {
            // création d'un cube
            mesh = BABYLON.MeshBuilder.CreateBox(
                `cube_${key}`,
                { size: 1 },
                this.scene
            );
            
            // matériau du cube 
            const material = new BABYLON.StandardMaterial(`mat_${key}`, this.scene);
            material.diffuseColor = new BABYLON.Color3(1, 1, 1);
            mesh.material = material;
        } else if (type === 'stair') {
            // noeud parent pour les escaliers
            mesh = new BABYLON.TransformNode(`stair_${key}`, this.scene);
            mesh.position = position;
            
            // le noeud parent sera renvoyé et addStairBlock
            // s'occupera d'ajouter les éléments visuels
        }
        
        mesh.position = position;
        
        // association au parent si spécifié
        if (parent) {
            mesh.parent = parent;
        }
        
        // stockage dans la grille
        this.grid[key] = {
            mesh: mesh,
            type: type
        };
        
        return mesh;
    }
    
    // suppression d'un élément de la grille
    removeGridElement(x, y, z) {
        const key = `${x},${y},${z}`;
        if (this.grid[key]) {
            this.grid[key].mesh.dispose();
            delete this.grid[key];
        }
    }
    
    // vérifier si une position est valide pour le pathfinding
    isValidPosition(pos) {
        // vérifier les limites de la grille
        if (pos.x < -this.gridSize || pos.x > this.gridSize || 
            pos.z < -this.gridSize || pos.z > this.gridSize) {
            return false;
        }
        
        // vérifier s'il y a un bloc
        const key = `${pos.x},${pos.y},${pos.z}`;
        const gridElement = this.grid[key];
        
        if (gridElement) {
            if (gridElement.type === 'stair') {
                // vérifier la direction de l'escalier
                const nextPos = gridElement.nextPosition;
                return nextPos && (
                    this.grid[`${nextPos.x},${nextPos.y},${nextPos.z}`] ||
                    this.isValidPlatformPosition(nextPos)
                );
            }
            return true;
        }
        
        return this.isValidPlatformPosition(pos);
    }
    
    // vérifier si une position est valide sur une plateforme
    isValidPlatformPosition(pos) {
        // utiliser les plateformes configurées avec notre système
        if (this.scene.rotatingPlatforms) {
            for (const platform of this.scene.rotatingPlatforms) {
                if (platform.isPositionValid(pos)) {
                    return true;
                }
            }
        }
        
        // méthode de secours pour les anciennes plateformes
        const platforms = this.scene.meshes.filter(mesh => mesh.name === "rotatingPlatform");
        for (let platform of platforms) {
            // on ignore si plateforme déjà vérifiée au-dessus
            if (platform.platformInstance) continue;
            
            const worldMatrix = platform.getWorldMatrix();
            const invWorldMatrix = worldMatrix.clone();
            invWorldMatrix.invert();
            
            const localPos = BABYLON.Vector3.TransformCoordinates(
                new BABYLON.Vector3(pos.x, pos.y, pos.z),
                invWorldMatrix
            );
            
            // tolérance pour les positions valides
            // pour une plateforme 3x1, les positions valides sont
            // le centre et les extrémités (-1,0,1 sur l'axe principal)
            const tolerance = 0.2;
            
            // vérification selon la rotation
            const rotY = platform.rotation.y % (Math.PI * 2);
            if (Math.abs(rotY) < tolerance || Math.abs(rotY - Math.PI) < tolerance) {
                // horizontal sur l'axe X (état 0 ou 2)
                if (Math.abs(localPos.z) < tolerance && 
                    (Math.abs(localPos.x) < tolerance || Math.abs(localPos.x - 1) < tolerance || Math.abs(localPos.x + 1) < tolerance) &&
                    Math.abs(localPos.y) < 0.6) {
                    return true;
                }
            } else {
                // horizontal sur l'axe Z (état 1 ou 3)
                if (Math.abs(localPos.x) < tolerance && 
                    (Math.abs(localPos.z) < tolerance || Math.abs(localPos.z - 1) < tolerance || Math.abs(localPos.z + 1) < tolerance) &&
                    Math.abs(localPos.y) < 0.6) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // récupérer tous les éléments de la grille
    getAllElements() {
        return this.grid;
    }
} 