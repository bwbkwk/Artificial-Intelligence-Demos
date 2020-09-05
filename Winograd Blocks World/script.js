let stage, ticker;

function tickHandler(){
    stage.update();
}

function init(){
    stage = new createjs.Stage("stage-canvas");
    ticker = createjs.Ticker.addEventListener("tick", tickHandler);
    let stageWidth = stage.canvas.clientWidth;
    let stageHeight = stage.canvas.clientHeight;
    blocksWorld.init(60, stageWidth, stageHeight, 32, 5);
    blocksWorld.render(stage);
    // alert("Welcome to Winograd Blocks World!");
}
    

let solver = {
    solve: function(originBlock, destBlock){
        this.moveList = [];
        if(originBlock.x == destBlock.x && destBlock.y+1 == originBlock.y) {
            return;
        }

        if(destBlock.y == blocksWorld.getSize().y-2){
            alert("Such operation is not allowed!");
            return;
        }

        this.requestOrigin = originBlock;
        this.requestDest = destBlock;
        
        // MENGHITUNG PERGERAKAN YANG DIBUTUHKAN
        this.clearTop(originBlock);
        this.clearTop(destBlock);
        
        this.move(originBlock, destBlock); 
        // =====================================

        // MERENDER ANIMASI PERGERAKAN
        this.moveList.reverse();
        let callback = function(){}

        for(i=0;i<this.moveList.length;i++){
            let cMove = this.moveList[i];
            callback = this.putOnTop(cMove.originX,cMove.originY,cMove.destX,cMove.destY, callback);
        }

        callback();
        // =====================================
    },
    move: function(originBlock, destBlock){
        let movement = {originX: originBlock.x, originY: originBlock.y, destX: destBlock.x, destY: destBlock.y};
        this.moveList.push(movement);
    },
    clearTop: function(block){
        let topBlock = blocksWorld.world[block.x][block.y+1];
        if(topBlock == undefined || topBlock == 'reserved'){
            return;
        }
        
        this.clearTop(topBlock);
        let destBlock = this.findClearSpace();
        blocksWorld.world[destBlock.x][destBlock.y+1]= 'reserved';
        
        this.move(topBlock, destBlock);
        return;
    },
    findClearSpace: function(){
        let wSize = blocksWorld.getSize();
        let selectedSpace = -1, currentHeight = 999;
        for(let x= 0; x< wSize.x; x++){
            if(x == this.requestOrigin.x || x == this.requestDest.x){
                continue;
            }
            for(let y= 0; y< wSize.y; y++){
                if(blocksWorld.world[x][y] == undefined){
                    if(currentHeight > y){
                        currentHeight = y;
                        selectedSpace = x;
                    }
                    break;
                }
            }
        }
        return {
            x: selectedSpace,
            y: currentHeight - 1
        }
    },
    putOnTop: function(originX, originY, destX, destY, callback= function(){}) {
        let animationFn = function(){
            let maxY = blocksWorld.getSize().y-1;
            
            // console.log("Origin     : ("+ originX+ ","+ originY+ ")");
            // console.log("Destination: ("+ destX+ ","+ destY+ ")");
            // console.log(blocksWorld.world[originX][originY]);
            // console.log(blocksWorld.world[originX][originY])
            let textObj = blocksWorld.world[originX][originY].text;
            let blockObj = blocksWorld.world[originX][originY].shape;
            let textWidth = textObj.getBounds().width;
            let originUp = blocksWorld.fromXYToActualPos(originX, maxY, textWidth);
            let slideToDest = blocksWorld.fromXYToActualPos(destX, maxY, textWidth);
            let destDown = blocksWorld.fromXYToActualPos(destX, destY+1, textWidth);

            let upTime = Math.abs(maxY - originY) * 100, 
                slideTime = Math.abs(originX - destX) * 100,
                downTime = Math.abs(maxY - destY) * 100
            createjs.Tween.get(textObj).
            to({x: originUp.textX, y: originUp.textY}, upTime).
            to({x: slideToDest.textX, y: slideToDest.textY}, slideTime).
            to({x: destDown.textX, y: destDown.textY}, downTime).call(callback);

            createjs.Tween.get(blockObj).
                to({x: originUp.blockX, y: originUp.blockY}, upTime).
                to({x: slideToDest.blockX, y: slideToDest.blockY}, slideTime).
                to({x: destDown.blockX, y: destDown.blockY}, downTime);

            blocksWorld.world[destX][destY+1] = blocksWorld.world[originX][originY];
            blocksWorld.world[destX][destY+1].x = destX;
            blocksWorld.world[destX][destY+1].y = destY+1;
            blocksWorld.world[originX][originY] = undefined;
        }
        
        return animationFn;
    },
}

let blocksWorld = {
    init: function(blockSize,stageWidth,stageHeight, blockCount,clearNTop = 3){
        this.blockSize = blockSize;
        this.clearNTop = clearNTop;

        let stageMaxBlock = (stageWidth * stageHeight) / (blockSize * blockSize)
        // console.log("Stage Max Block: " +stageMaxBlock);
        if(stageMaxBlock * 0.5 < blockCount){
            throw new Error("Please provide a smaller blockCount parameter.");
        }
        if(blockCount < 4){
            throw new Error("blockCount parameter must be greater than 3.")
        }

        this.stageWidth = stageWidth;
        this.stageHeight = stageHeight;

        this.world = new Array(stageWidth/blockSize);
        randomObjectIds = this.generateBlockIDs(blockCount);
        let yBlock = stageHeight/blockSize;
        for(let x=0; x < this.world.length; x++){
            this.world[x] = new Array(yBlock);
        }
        
        for(let i=0; i < randomObjectIds.length; i++){
            block = this.generateBlock(randomObjectIds[i]);
            let repeat = false;
            do {
                try {
                    loc = Math.floor(Math.random()* this.getSize().x);
                    this.put(block,loc);
                    repeat = false;
                } catch(err) {
                    repeat = true;
                }
            } while(repeat);
            
        }
    },
    generateBlock: function(blockId){
        let parent = this;
        return {
            id: blockId,
            color: this.generateRandomColor(),
            parent
        }
    },
    generateRandomColor: function(){
        return "hsl(" + 360 * Math.random() + ',' +
            (25 + 70 * Math.random()) + '%,' + 
            (85 + 10 * Math.random()) + '%)';

    },
    render: function(stage){
        let size = this.getSize()
        for(let x=0; x < size.x; x++){
            for(let y=0; y < size.y; y++){
                let block = this.world[x][y];
                if(block == undefined)
                    continue;

                // console.log("("+posX+", "+posY+")");
                
                let blockShape = new createjs.Shape();
                blockShape.graphics.setStrokeStyle(1);
                blockShape.graphics.beginStroke('#000000');
                blockShape.graphics.beginFill(block.color);
                blockShape.graphics.drawRect(0, 0, this.blockSize, this.blockSize);
                blockShape.graphics.endStroke();
                blockShape.graphics.endFill();
                
                let blockText = new createjs.Text(block.id,"bold 36px Calibri");

                let textWidth = blockText.getBounds().width;

                let actualPos = this.fromXYToActualPos(x,y,textWidth);

                blockShape.x = actualPos.blockX;
                blockShape.y = actualPos.blockY;

                blockText.x = actualPos.textX;
                blockText.y = actualPos.textY;
                blockText.textBaseline = "middle";

                block.text = blockText;
                block.shape = blockShape;
                block.selected = false;

                blockShape.extraInformations = block;


                blockShape.addEventListener("click",function(event){
                    let info = event.target.extraInformations;
                    let prevBlock = info.parent.currentSelectedBlock;
                    if (!info.selected){
                        if(prevBlock == undefined){
                            createjs.Tween.get(event.target,{loop: true, bounce:true}).to({alpha:0.5},500);
                            createjs.Tween.get(info.text,{loop: true, bounce:true}).to({alpha:0.5},500);
                            info.selected = true;
                            info.parent.currentSelectedBlock = event.target;
                            return
                        } else {
                            createjs.Tween.removeTweens(prevBlock);
                            createjs.Tween.removeTweens(prevBlock.extraInformations.text);
                            prevBlock.alpha = 1.0;
                            prevBlock.extraInformations.text.alpha = 1.0;
                            prevBlock.extraInformations.selected = false;
                            
                            solver.solve(prevBlock.extraInformations, info);
                            info.parent.currentSelectedBlock = undefined;
                        }
                    }
                    else {
                            createjs.Tween.removeTweens(event.target);
                            createjs.Tween.removeTweens(info.text);
                            event.target.alpha = 1.0;
                            info.text.alpha = 1.0;
                            info.selected = false;
                            info.parent.currentSelectedBlock = undefined;
                    }
                });

                stage.addChild(blockShape);
                stage.addChild(blockText);
                stage.update();
            }
        }
    },
    fromXYToActualPos: function(x,y,textWidth){
        let offsideX = textWidth/2,
            blockX = x * this.blockSize,
            blockY = this.stageHeight - (y + 1) * this.blockSize,
            textX = blockX + this.blockSize/2 - offsideX,
            textY = blockY + this.blockSize/2
        return {
            blockX,
            blockY,
            textX,
            textY

        }
    },
    put: function(block, x){
        let success = false;
        for(let y=0; y < this.getSize().y- this.clearNTop; y++){
            if(this.world[x][y] == undefined){
                this.world[x][y] = block;
                block.x = x;
                block.y = y;
                success= true;
                break;
            }
        }
        if(!success){
            throw new Error("Can not put the block on the position x of "+ x + ".");
        }
        return;
    },
    getSize: function(){
        return {
            x: this.world.length,
            y: this.world[0].length
        }
    },
    generateBlockIDs: function(size){
        let blockIds = new Set();

        while(blockIds.size != size){
            let alphabet = String.fromCharCode(65 + Math.floor(Math.random()* 26));
            let number = Math.floor(Math.random() * 10);
            let newId = alphabet + number;
            
            // console.log(newId);
            if(!blockIds.has(newId)){
                blockIds.add(newId);
            }
        }

        return Array.from(blockIds);
    }
}