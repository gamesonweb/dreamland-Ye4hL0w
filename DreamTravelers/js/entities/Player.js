class Player {
    constructor(scene, grid) {
        this.scene = scene;
        this.grid = grid;
        this.mesh = null;
        this.position = { x: 0, y: 0, z: 0 };
        this.pathLine = null;
        this.isMoving = false;
        
        this.createPlayerMesh();
    }
    
    createPlayerMesh() {
        // charger le modèle avec le fichier GLB
        BABYLON.SceneLoader.ImportMesh("", "models/characters/", "samourai_floating.glb", this.scene, (meshes) => {
            this.mesh = new BABYLON.Mesh("playerContainer", this.scene);
            
            meshes.forEach(mesh => {
                mesh.parent = this.mesh;
            });
            
            // agrandir le modèle
            this.mesh.scaling = new BABYLON.Vector3(2, 2, 2);
            
            // positionner le modèle
            this.mesh.position = new BABYLON.Vector3(
                this.position.x,
                this.position.y + 1,
                this.position.z
            );
            
            // redresser le modèle
            this.mesh.rotation.x = Math.PI / 2;
            this.mesh.rotation.y = Math.PI;
            
            console.log("Modèle Samouraï chargé avec succès");
        }, 
        null, 
        (scene, message) => {
            console.error("Erreur lors du chargement du modèle Samouraï:", message);
            // sphere de secours
            this.createFallbackMesh();
        });
    }
    
    // sphere de secours si le chargement du modèle échoue
    createFallbackMesh() {
        this.mesh = BABYLON.MeshBuilder.CreateSphere("player", {
            diameter: 0.8
        }, this.scene);
        
        const material = new BABYLON.StandardMaterial("playerMat", this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material.emissiveColor = new BABYLON.Color3(0.5, 0.25, 0);
        material.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        this.mesh.material = material;

        this.mesh.position = new BABYLON.Vector3(
            this.position.x,
            this.position.y,
            this.position.z
        );
        
        console.log("Utilisation du mesh de secours (sphère)");
    }
    
    setPosition(x, y, z) {
        this.position = { x, y, z };
        this.mesh.position = new BABYLON.Vector3(x, y + 1, z);
        this.updateParent();
    }
    
    updateParent() {
        if (this._startTime === undefined) {
            this._startTime = performance.now();
        }
        
        const currentTime = performance.now();
        const timeSinceStart = currentTime - this._startTime;
        
        if (timeSinceStart < 500) {
            return;
        }
        
        // position actuelle du joueur
        const currentPosition = {
            x: Math.round(this.position.x),
            y: Math.round(this.position.y),
            z: Math.round(this.position.z)
        };
        
        let isOnPlatform = false;
        
        // vérifier si le joueur est sur une plateforme rotative
        if (this.scene.rotatingPlatforms) {
            for (const platform of this.scene.rotatingPlatforms) {
                // vérifier si le joueur est sur une des positions valides
                if (platform.isPositionValid(currentPosition)) {
                    isOnPlatform = true;
                    
                    // attacher le joueur à la plateforme
                    if (this.mesh.parent !== platform.mesh) {
                        // sauvegarder la position
                        const worldPosition = this.mesh.getAbsolutePosition();
                        
                        // changer le parent
                        this.mesh.parent = platform.mesh;
                        
                        // calculer la position locale
                        const invWorldMatrix = platform.mesh.getWorldMatrix().clone();
                        invWorldMatrix.invert();
                        
                        this.mesh.position = BABYLON.Vector3.TransformCoordinates(
                            worldPosition,
                            invWorldMatrix
                        );
                        
                        // stocker une référence au joueur
                        this.mesh.playerInstance = this;
                        
                        console.log("Joueur attaché à la plateforme rotative");
                    }
                    
                    break;
                }
            }
        }
        
        // si le joueur n'est pas sur une plateforme et a un parent, le détacher
        if (!isOnPlatform && this.mesh.parent) {
            // sauvegarder la position
            const worldPosition = this.mesh.getAbsolutePosition();
            
            // détacher
            this.mesh.parent = null;
            
            // restaurer la position
            this.mesh.position = worldPosition;
            
            console.log("Joueur détaché de la plateforme");
        }
    }
    
    /*
     * Système de pathfinding
     * 
     * findPath : méthode principale qui décide quelle stratégie utiliser
     * - vérifie si on peut se déplacer
     * - utilise findDescentPath en mode normal pour descendre
     * - utilise findDescentPath en mode inversé pour monter (on calcule le chemin de haut en bas puis on l'inverse)
     * - gère les contraintes du Level3
     * 
     * findDescentPath : moteur principal de recherche de chemin
     * - algorithme A* simplifié
     * - détecte les escaliers et plateformes spéciales
     * - favorise les chemins via escaliers (coût réduit)
     * - gère les déplacements sur même niveau et la descente
     */
    findPath(target) {
        // si la cible est celle de la position actuelle, retourner un chemin vide
        if (target.x === this.position.x && target.y === this.position.y && target.z === this.position.z) {
            return [];
        }
        
        console.log("Position actuelle:", this.position);
        console.log("Position cible:", target);
        
        // bloquer la montée verticale à travers des piliers
        if (target.y > this.position.y) {
            const sameXZ = target.x === this.position.x && target.z === this.position.z;
            
            if (sameXZ) {
                // on essaie de monter verticalement - vérifier s'il s'agit d'un escalier
                const targetKey = `${target.x},${target.y},${target.z}`;
                const gridElements = this.grid.getAllElements();
                const targetElement = gridElements[targetKey];
                
                // si ce n'est pas un escalier, interdire le mouvement
                if (!targetElement || targetElement.type !== 'stair') {
                    console.log("Tentative de montée verticale à travers un pilier bloquée");
                    return [];
                }
            }
            
        }
        
        // empêcher les chemins traversant du vide
        if (target.y === this.position.y) {
            const dx = Math.abs(target.x - this.position.x);
            const dz = Math.abs(target.z - this.position.z);

            // si les positions sont alignées sur un axe et à distance > 1
            if ((dx > 1 && dz === 0) || (dz > 1 && dx === 0)) {
                console.log("Vérification de chemin continu sur une ligne droite");
                
                // détermine les pas entre les positions
                const stepX = dx === 0 ? 0 : (target.x - this.position.x) / dx;
                const stepZ = dz === 0 ? 0 : (target.z - this.position.z) / dz;
                
                // vérifier chaque point
                let pointsValides = true;
                for (let i = 1; i < Math.max(dx, dz); i++) {
                    const intermediatePos = {
                        x: this.position.x + Math.round(stepX * i),
                        y: this.position.y,
                        z: this.position.z + Math.round(stepZ * i)
                    };
                    
                    // vérifier si ce point est valide
                    const intermediateKey = `${intermediatePos.x},${intermediatePos.y},${intermediatePos.z}`;
                    const isValid = this.grid.grid[intermediateKey] !== undefined ||
                                    this.grid.isValidPlatformPosition(intermediatePos);
                    
                    if (!isValid) {
                        console.log("Détection d'un vide sur le chemin à la position:", intermediatePos);
                        pointsValides = false;
                        break;
                    }
                }
                
                // si un point n'est pas valide on retourne un chemin vide
                if (!pointsValides) {
                    console.log("Chemin traversant un vide détecté - mouvement impossible");
                    return [];
                }
            }
        }
        
        const gridElements = this.grid.getAllElements();
        
        // si on monte (y augmente) on utilise la recherche inverse
        if (target.y > this.position.y) {
            console.log("montée détectée - utilisation de la recherche de chemin inverse");
            const reversePath = this.findDescentPath(target, this.position);
            if (reversePath.length > 0) {
                // inverser le chemin pour obtenir le chemin de montée
                const ascendingPath = reversePath.reverse();
                console.log("chemin de montée trouvé:", ascendingPath);
                
                // s'assurer que tous les points ont des coordonnées définies
                for (let i = 0; i < ascendingPath.length; i++) {
                    if (ascendingPath[i] === undefined || 
                        ascendingPath[i].x === undefined || 
                        ascendingPath[i].y === undefined || 
                        ascendingPath[i].z === undefined) {
                        console.error("chemin invalide détecté à l'index", i, ascendingPath);
                        return []; // chemin vide plutôt qu'un chemin avec des points invalides
                    }
                }
                
                // on vérifie strictement que le chemin ne monte que via des escaliers
                if (this.scene.level && this.scene.level.constructor.name === "Level3") {
                    console.log("Niveau 3 détecté, vérification stricte du chemin de montée");
                    let isValidAscendingPath = true;
                    for (let i = 1; i < ascendingPath.length; i++) {
                        const prevPoint = ascendingPath[i-1];
                        const currPoint = ascendingPath[i];
                        
                        // si on monte entre ces deux points
                        if (currPoint.y > prevPoint.y) {
                            // vérifier que le point précédent est un escalier
                            const prevKey = `${prevPoint.x},${prevPoint.y},${prevPoint.z}`;
                            const prevElement = gridElements[prevKey];
                            
                            if (!prevElement || prevElement.type !== 'stair') {
                                console.log("Chemin de montée invalide détecté - point non-escalier:", prevPoint);
                                isValidAscendingPath = false;
                                break;
                            }
                            
                            // vérifier que la montée correspond à la prochaine position de l'escalier
                            if (!prevElement.nextPosition || 
                                prevElement.nextPosition.x !== currPoint.x || 
                                prevElement.nextPosition.y !== currPoint.y || 
                                prevElement.nextPosition.z !== currPoint.z) {
                                console.log("Chemin de montée invalide - point ne correspond pas à la prochaine position de l'escalier:", prevPoint, currPoint);
                                isValidAscendingPath = false;
                                break;
                            }
                        }
                    }
                    
                    if (!isValidAscendingPath) {
                        console.log("Chemin de montée rejeté car il ne passe pas uniquement par des escaliers");
                        return [];
                    }
                }
                
                // verifier que la destination finale est incluse dans le chemin
                const lastPoint = ascendingPath[ascendingPath.length - 1];
                if (lastPoint.x !== target.x || lastPoint.y !== target.y || lastPoint.z !== target.z) {
                    console.log("Ajout explicite de la destination finale au chemin de montée");
                    ascendingPath.push({...target});
                }
                
                return ascendingPath;
            }
            return [];
        }
        
        // pour la descente on utilise la recherche normale
        const descendingPath = this.findDescentPath(this.position, target);
        
        // verifier que la destination finale est incluse dans le chemin de descente
        if (descendingPath.length > 0) {
            const lastPoint = descendingPath[descendingPath.length - 1];
            if (lastPoint.x !== target.x || lastPoint.y !== target.y || lastPoint.z !== target.z) {
                console.log("Ajout explicite de la destination finale au chemin de descente");
                descendingPath.push({...target});
            }
        }
        
        return descendingPath;
    }
    
    findDescentPath(start, target) {
        const gridElements = this.grid.getAllElements();
        const path = [];
        
        // verification pour les escaliers
        // si on cherche un chemin vers un escalier
        const startKey = `${start.x},${start.y},${start.z}`;
        const targetKey = `${target.x},${target.y},${target.z}`;
        const startElement = gridElements[startKey];
        const targetElement = gridElements[targetKey];
        
        // si la cible est un escalier adjacent au départ
        if (targetElement && targetElement.type === 'stair') {
            const dxToStair = Math.abs(start.x - target.x);
            const dzToStair = Math.abs(start.z - target.z);
            const isStairAdjacent = dxToStair + dzToStair <= 1;
            
            if (isStairAdjacent) {
                console.log("Escalier adjacent détecté comme destination");
                // si l'escalier a une position suivante
                if (targetElement.nextPosition) {
                    return [
                        { ...target }, // l'escalier
                        { ...targetElement.nextPosition } // position après l'escalier
                    ];
                }
                // sinon, juste l'escalier comme chemin
                return [{ ...target }];
            }
        }
        
        // si le départ est un escalier et la cible est sa position suivante
        if (startElement && startElement.type === 'stair' && startElement.nextPosition) {
            const nextPos = startElement.nextPosition;
            if (nextPos.x === target.x && nextPos.y === target.y && nextPos.z === target.z) {
                console.log("Position après escalier détectée comme destination");
                return [{ ...target }];
            }
        }
        
        // limiter les itérations pour éviter les boucles
        const maxIterations = 100;
        let iterations = 0;
        
        // version simplifiée de A*
        const openSet = [{ ...start, g: 0, h: 0, f: 0, parent: null }];
        const closedSet = new Set();
        
        // distance de manhattan
        const heuristic = (a, b) => {
            return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
        };
        
        const posEqual = (a, b) => {
            return a.x === b.x && a.y === b.y && a.z === b.z;
        };
        
        // clé unique pour chaque position
        const posKey = (pos) => `${pos.x},${pos.y},${pos.z}`;
        
        // vérifier si une position est valide
        const isValidMove = (pos) => {
            if (pos === undefined || 
                pos.x === undefined || 
                pos.y === undefined || 
                pos.z === undefined) {
                return false;
            }
            
            if (this.grid.isValidPosition(pos) || this.grid.isValidPlatformPosition(pos)) {
                return true;
            }
            
            // vérifier si c'est un escalier
            const posKey = `${pos.x},${pos.y},${pos.z}`;
            const element = gridElements[posKey];
            if (element && element.type === 'stair') {
                return true;
            }
            
            // vérifier si c'est un slider
            const sliders = this.scene.meshes.filter(mesh => mesh.name === "slider");
            for (const slider of sliders) {
                const sliderPos = slider.position;
                const dx = Math.abs(pos.x - Math.round(sliderPos.x));
                const dy = Math.abs(pos.y - Math.round(sliderPos.y));
                const dz = Math.abs(pos.z - Math.round(sliderPos.z));
                
                if (dx <= 0.5 && dy <= 1 && dz <= 0.5) {
                    console.log("Position sur un slider détectée dans le pathfinding:", pos);
                    return true;
                }
            }
            
            return false;
        };
        
        // voisins pour la descente
        const getNeighbors = (pos) => {
            const neighbors = [];
            const currentKey = posKey(pos);
            const currentElement = gridElements[currentKey];
            
            const directions = [
                { x: 1, y: 0, z: 0 },
                { x: -1, y: 0, z: 0 },
                { x: 0, y: 0, z: 1 },
                { x: 0, y: 0, z: -1 }
            ];
            
            // ajouter les voisins sur le même niveau
            for (const dir of directions) {
                const newPos = {
                    x: pos.x + dir.x,
                    y: pos.y + dir.y,
                    z: pos.z + dir.z
                };
                if (isValidMove(newPos)) {
                    neighbors.push(newPos);
                }
            }
            
            // si on est sur un escalier, ajouter sa destination
            if (currentElement && currentElement.type === 'stair' && currentElement.nextPosition) {
                neighbors.push(currentElement.nextPosition);
                console.log("Position suivante d'escalier ajoutée comme voisin:", currentElement.nextPosition);
            }
            
            // vérifier si position est destination d'un escalier
            for (const [key, element] of Object.entries(gridElements)) {
                if (element.type === 'stair' && element.nextPosition) {
                    const next = element.nextPosition;
                    if (next.x === pos.x && next.y === pos.y && next.z === pos.z) {
                        const [x, y, z] = key.split(',').map(Number);
                        const stairPos = { x, y, z };
                        neighbors.push(stairPos);
                        console.log("Escalier trouvé comme voisin:", stairPos);
                    }
                }
            }
            
            // Pour la descente
            if (pos.y > target.y) {
                if (currentElement && currentElement.type === 'stair') {
                    // Si on est sur un escalier, on peut descendre directement
                    const directionsDescente = [
                        { x: 0, y: -1, z: 0 },
                        { x: 1, y: -1, z: 0 },
                        { x: -1, y: -1, z: 0 },
                        { x: 0, y: -1, z: 1 },
                        { x: 0, y: -1, z: -1 }
                    ];
                    
                    for (const dir of directionsDescente) {
                        const posDescente = {
                            x: pos.x + dir.x,
                            y: pos.y + dir.y,
                            z: pos.z + dir.z
                        };
                        
                        if (isValidMove(posDescente)) {
                            neighbors.push(posDescente);
                        }
                    }
                }
                else {
                    const directionsDescenteDiagonale = [
                        { x: 1, y: -1, z: 0 },
                        { x: -1, y: -1, z: 0 },
                        { x: 0, y: -1, z: 1 },
                        { x: 0, y: -1, z: -1 }
                    ];
                    
                    for (const dir of directionsDescenteDiagonale) {
                        const posDescente = {
                            x: pos.x + dir.x,
                            y: pos.y + dir.y,
                            z: pos.z + dir.z
                        };
                        
                        if (isValidMove(posDescente)) {
                            neighbors.push(posDescente);
                        }
                    }
                }
            }
            
            return neighbors;
        };
        
        // trouver un chemin avec A*
        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;
            
            // trier par coût f
            openSet.sort((a, b) => a.f - b.f);
            
            // prendre le nœud avec le coût le plus bas
            const current = openSet.shift();
            
            // si on a atteint la destination
            if (posEqual(current, target)) {
                // reconstruire le chemin
                let currentNode = current;
                while (currentNode.parent) {
                    path.unshift({
                        x: currentNode.x,
                        y: currentNode.y,
                        z: currentNode.z
                    });
                    currentNode = currentNode.parent;
                }
                
                // ajouter la destination finale si besoin
                if (path.length === 0 || !posEqual(path[path.length - 1], target)) {
                    path.push({...target});
                }
                
                return path;
            }
            
            // ajouter le nœud à l'ensemble fermé
            closedSet.add(posKey(current));
            
            const neighbors = getNeighbors(current);
            
            for (const neighbor of neighbors) {
                if (closedSet.has(posKey(neighbor))) {
                    continue;
                }
                
                // calculer le coût
                const isStairNeighbor = gridElements[posKey(neighbor)]?.type === 'stair';
                const isLevelChange = current.y !== neighbor.y;
                let moveCost = 1;
                
                // favoriser les escaliers pour les changements de niveau
                if (isLevelChange && isStairNeighbor) {
                    moveCost = 0.5;
                } else if (isLevelChange && !isStairNeighbor) {
                    moveCost = 1.2;
                }
                
                const tentativeG = current.g + moveCost;
                
                // vérifier si voisin est déjà dans l'ensemble ouvert
                const existingNeighbor = openSet.find(n => posEqual(n, neighbor));
                
                if (!existingNeighbor || tentativeG < existingNeighbor.g) {
                    // meilleur chemin, mettre à jour ou ajouter
                    const h = heuristic(neighbor, target);
                    
                    if (!existingNeighbor) {
                        openSet.push({
                            ...neighbor,
                            g: tentativeG,
                            h: h,
                            f: tentativeG + h,
                            parent: current
                        });
                    } else {
                        existingNeighbor.g = tentativeG;
                        existingNeighbor.f = tentativeG + h;
                        existingNeighbor.parent = current;
                    }
                }
            }
        }
        
        // si pas de chemin, vérifier accès direct
        const distance = Math.abs(start.x - target.x) + Math.abs(start.z - target.z) + Math.abs(start.y - target.y);
        if (distance <= 2 && isValidMove(target)) {
            // vérifier que le chemin direct est valide
            // pour un déplacement diagonal x et z changent
            const diagonalMove = Math.abs(start.x - target.x) > 0 && Math.abs(start.z - target.z) > 0;
            
            if (diagonalMove) {
                // points possibles pour un déplacement diagonal
                const intermediatePoints = [
                    { x: start.x, y: target.y, z: target.z }, // passage par x puis z
                    { x: target.x, y: target.y, z: start.z }  // passage par z puis x
                ];
                
                let hasValidPath = false;
                
                // vérifier si un des chemins intermédiaires est valide
                for (const point of intermediatePoints) {
                    const pointKey = `${point.x},${point.y},${point.z}`;
                    const isValid = this.grid.grid[pointKey] !== undefined ||
                                   this.grid.isValidPlatformPosition(point);
                    
                    if (isValid) {
                        hasValidPath = true;
                        break;
                    }
                }
                
                if (!hasValidPath) {
                    console.log("Déplacement diagonal bloqué - aucun chemin intermédiaire valide trouvé");
                    return [];
                }
            }
            
            console.log("Chemin direct utilisé vers la cible à proximité");
            return [{ ...target }];
        }
        
        return [];
    }
    
    moveAlongPath(path) {
        if (!path || path.length === 0) {
            console.log("Tentative de déplacement avec un chemin vide");
            return;
        }
        
        // vérifier que les points ont des coordonnées définies
        for (let i = 0; i < path.length; i++) {
            if (path[i] === undefined || 
                path[i].x === undefined || 
                path[i].y === undefined || 
                path[i].z === undefined) {
                console.error("Point de chemin invalide détecté à l'index", i, path);
                return; // arrêter si point invalide
            }
        }
        
        try {
            this.isMoving = true;
            
            // save la position
            const worldPos = this.mesh.getAbsolutePosition();
            this.mesh.parent = null;
            this.mesh.position = worldPos;
            
            if (this.pathLine) {
                this.pathLine.dispose();
            }
            
            const pathPoints = [this.mesh.position.clone(), ...path.map(pos => new BABYLON.Vector3(
                pos.x,
                pos.y + 1,
                pos.z
            ))];
            
            // afficher le chemin
            this.pathLine = BABYLON.MeshBuilder.CreateLines("pathLine", {
                points: pathPoints,
                updatable: true
            }, this.scene);
            this.pathLine.color = new BABYLON.Color3(0, 1, 1);
            
            // animation
            const animationSpeed = 4; // vitesse
            
            // calculer la distance totale
            let totalDistance = 0;
            for (let i = 1; i < pathPoints.length; i++) {
                totalDistance += BABYLON.Vector3.Distance(pathPoints[i-1], pathPoints[i]);
            }
            
            // calculer la durée totale
            const totalDuration = totalDistance / animationSpeed;
            const totalFrames = Math.ceil(totalDuration * 60); // 60 FPS
            
            // créer l'animation
            const animation = new BABYLON.Animation(
                "playerMove",
                "position",
                60,
                BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            
            // vérif des points
            const points = [];
            for (let i = 0; i < pathPoints.length; i++) {
                if (pathPoints[i] && 
                    pathPoints[i].x !== undefined && 
                    pathPoints[i].y !== undefined && 
                    pathPoints[i].z !== undefined) {
                    points.push(new BABYLON.Vector3(
                        pathPoints[i].x,
                        pathPoints[i].y,
                        pathPoints[i].z
                    ));
                } else {
                    console.error("Point de chemin invalide détecté lors de la création de la spline:", i, pathPoints[i]);
                    // aller directement au dernier point
                    this.useDirectMovement(path[path.length - 1]);
                    return;
                }
            }
            
            if (points.length < 2) {
                console.error("Pas assez de points valides pour créer une spline");
                if (path.length > 0) {
                    this.useDirectMovement(path[path.length - 1]);
                }
                return;
            }
            
            try {
                const catmullRom = BABYLON.Curve3.CreateCatmullRomSpline(points, 5, false);
                const curvePoints = catmullRom.getPoints();
                
                // créer des keyframes
                const keyframes = [];
                const step = curvePoints.length / totalFrames;
                
                for (let i = 0; i <= totalFrames; i++) {
                    const index = Math.min(Math.floor(i * step), curvePoints.length - 1);
                    keyframes.push({
                        frame: i,
                        value: curvePoints[index]
                    });
                }
                
                animation.setKeys(keyframes);
                
                // mouvement fluide
                const easingFunction = new BABYLON.CircleEase();
                easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
                animation.setEasingFunction(easingFunction);
                
                // appliquer l'animation
                this.mesh.animations = [animation];
                
                // lancer l'animation
                this.scene.beginAnimation(
                    this.mesh,
                    0,
                    totalFrames,
                    false,
                    1.0,
                    () => {
                        // nettoyer après l'animation
                        if (this.pathLine) {
                            this.pathLine.dispose();
                            this.pathLine = null;
                        }
                        
                        // mettre à jour la position
                        this.position = path[path.length - 1];
                        
                        // mettre à jour le parent
                        this.updateParent();
                        
                        // terminer le mouvement
                        this.isMoving = false;
                    }
                );
                
                // animation de rotation
                this.animateRotationAlongPath(path);
            } catch (error) {
                console.error("Erreur lors de la création de l'animation spline:", error);
                // en cas d'erreur
                if (path.length > 0) {
                    this.useDirectMovement(path[path.length - 1]);
                } else {
                    this.isMoving = false;
                }
            }
        } catch (error) {
            // en cas d'erreur
            console.error("Erreur lors du déplacement:", error);
            
            this.isMoving = false;
            if (this.pathLine) {
                this.pathLine.dispose();
                this.pathLine = null;
            }
        }
    }
    
    // mouvement direct en cas d'erreur
    useDirectMovement(targetPos) {
        console.log("Utilisation d'un mouvement direct vers la cible", targetPos);
        
        const animation = new BABYLON.Animation(
            "playerDirectMove",
            "position",
            60,
            BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        const keyframes = [
            { frame: 0, value: this.mesh.position.clone() },
            { frame: 60, value: new BABYLON.Vector3(targetPos.x, targetPos.y + 1, targetPos.z) }
        ];
        
        animation.setKeys(keyframes);
        
        // mouvement fluide
        const easingFunction = new BABYLON.CircleEase();
        easingFunction.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
        animation.setEasingFunction(easingFunction);
        
        // appliquer l'animation
        this.mesh.animations = [animation];
        
        // lancer l'animation
        this.scene.beginAnimation(
            this.mesh,
            0,
            60,
            false,
            1.0,
            () => {
                // nettoyer après l'animation
                if (this.pathLine) {
                    this.pathLine.dispose();
                    this.pathLine = null;
                }
                
                // mettre à jour la position
                this.position = targetPos;
                
                // mettre à jour le parent
                this.updateParent();
                
                // terminer le mouvement
                this.isMoving = false;
            }
        );
    }
    
    // animation de rotation
    animateRotationAlongPath(path) {
        if (!path || path.length < 2) return;
        
        // points du chemin convertis en Vector3
        const points = [];
        for (let i = 0; i < path.length; i++) {
            if (path[i] && path[i].x !== undefined && path[i].y !== undefined && path[i].z !== undefined) {
                points.push(new BABYLON.Vector3(path[i].x, path[i].y, path[i].z));
            }
        }
        
        // vérifier qu'on a assez de points
        if (points.length < 2) {
            console.log("Pas assez de points valides pour l'animation de rotation");
            return;
        }
        
        // position actuelle
        const startPos = this.mesh.position.clone();
        
        // rotation actuelle
        let currentRotation = this.mesh.rotation.y;
        
        // observation de la position pour ajuster la rotation
        const observer = this.scene.onBeforeRenderObservable.add(() => {
            if (!this.isMoving) {
                this.scene.onBeforeRenderObservable.remove(observer);
                return;
            }
            
            try {
                // chercher le segment le plus proche
                const currentPos = this.mesh.position.clone();
                let closestDistanceSq = Infinity;
                let targetDirection = null;
                
                for (let i = 0; i < points.length - 1; i++) {
                    const segmentStart = new BABYLON.Vector3(points[i].x, 0, points[i].z);
                    const segmentEnd = new BABYLON.Vector3(points[i + 1].x, 0, points[i + 1].z);
                    
                    // calculer la distance
                    const v = segmentEnd.subtract(segmentStart);
                    const w = currentPos.subtract(segmentStart);
                    
                    const c1 = BABYLON.Vector3.Dot(w, v);
                    if (c1 <= 0) {
                        // point le plus proche est le début
                        const distSq = BABYLON.Vector3.DistanceSquared(currentPos, segmentStart);
                        if (distSq < closestDistanceSq) {
                            closestDistanceSq = distSq;
                            targetDirection = v;
                        }
                        continue;
                    }
                    
                    const c2 = BABYLON.Vector3.Dot(v, v);
                    if (c2 <= c1) {
                        // point le plus proche est la fin
                        const distSq = BABYLON.Vector3.DistanceSquared(currentPos, segmentEnd);
                        if (distSq < closestDistanceSq) {
                            closestDistanceSq = distSq;
                            targetDirection = v;
                        }
                        continue;
                    }
                    
                    // point le plus proche est sur le segment
                    const b = c1 / c2;
                    const pb = segmentStart.add(v.scale(b));
                    const distSq = BABYLON.Vector3.DistanceSquared(currentPos, pb);
                    
                    if (distSq < closestDistanceSq) {
                        closestDistanceSq = distSq;
                        targetDirection = v;
                    }
                }
                
                // si direction trouvée, tourner vers elle
                if (targetDirection) {
                    targetDirection.normalize();
                    
                    // calculer l'angle cible
                    const targetAngle = Math.atan2(targetDirection.x, targetDirection.z);
                    
                    // tourner
                    const rotationSpeed = 0.15;
                    currentRotation = BABYLON.Scalar.Lerp(currentRotation, targetAngle, rotationSpeed);
                    
                    this.mesh.rotation.y = currentRotation;
                }
            } catch (error) {
                console.error("Erreur dans l'animation de rotation:", error);
                this.scene.onBeforeRenderObservable.remove(observer);
            }
        });
    }
}
