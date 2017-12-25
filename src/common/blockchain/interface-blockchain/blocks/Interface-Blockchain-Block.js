var BigInteger = require('big-integer');
const colors = require('colors/safe');
import WebDollarCryptoData from 'common/crypto/WebDollar-Crypto-Data'
import WebDollarCrypto from 'common/crypto/WebDollar-Crypto'
import BlockchainGenesis from 'common/blockchain/interface-blockchain/blocks/Blockchain-Genesis'
import BlockchainMiningReward from 'common/blockchain/Blockchain-Mining-Reward'
import consts from 'consts/const_global'
import InterfaceSatoshminDB from 'common/satoshmindb/Interface-SatoshminDB'
import InterfaceBlockchainBlockData from './Interface-Blockchain-Block-Data';
import Serialization from "common/utils/Serialization.js";
import BufferExtend from "common/utils/BufferExtended.js";

/*
    Tutorial based on https://en.bitcoin.it/wiki/Block_hashing_algorithm
 */

class InterfaceBlockchainBlock {

    //everything is buffer

    constructor (blockchain, version, hash, hashPrev, timeStamp, nonce, data, height, db){

        this.blockchain = blockchain;

        this.version = version||null; // 2 bytes version                                                 - 2 bytes

        this.hash = hash||null; // 256-bit hash based on all of the transactions in the block     - 32 bytes, sha256

        this.hashPrev = hashPrev||null; // 256-bit hash sha256    l                                         - 32 bytes, sha256



        this.nonce = nonce||0;//	int 2^8^5 number (starts at 0)-  int,                              - 5 bytes
        
        if ( timeStamp === undefined){

            timeStamp = Math.floor( new Date().getTime() / 1000 ) - BlockchainGenesis.timeStamp;
        }

        this.timeStamp = timeStamp||null; //Current timestamp as seconds since 1970-01-01T00:00 UTC        - 4 bytes,


        if (data === undefined || data === null)
            data = this.createEmptyBlockData();

        this.data = data;


        //computed data
        this.computedBlockPrefix = null;

        this.difficultyTarget = null; // difficulty set by me
        this.height = (typeof height === "number" ? height : null); // index set by me

        this.reward = 0;

        this.db = db;
    }

    createEmptyBlockData(){
        return new InterfaceBlockchainBlockData(this.blockchain );
    }

    async validateBlock(height, previousDifficultyTarget, previousHash){

        if (this.version === undefined || this.version === null || typeof this.version !== 'number') throw ('version is empty');

        if (this.hash === undefined || this.hash === null || !Buffer.isBuffer(this.hash) ) throw ('hash is empty');
        if (this.hashPrev === undefined || this.hashPrev === null || !Buffer.isBuffer(this.hashPrev) ) throw ('hashPrev is empty');



        if (this.nonce === undefined || this.nonce === null || typeof this.nonce !== 'number') throw ('nonce is empty');
        if (this.timeStamp === undefined || this.timeStamp === null || typeof this.timeStamp !== 'number') throw ('timeStamp is empty');

        //timestamp must be on 4 bytes
        this.timeStamp = Math.floor(this.timeStamp);
        if (this.timeStamp >= 0xFFFFFFFF) throw ('timeStamp is invalid');

        if (height >=0)
            if (this.version !== 0x01) throw ('invalid version');

        if (height !== this.height) throw 'height is different';

        await this._validateBlockHash(previousHash);
        this._validateTargetDifficulty(previousDifficultyTarget);

        if (this.reward.equals(BlockchainMiningReward.getReward(this.height)) === false ) throw 'reward is not right: '+this.reward +' vs '+BlockchainMiningReward.getReward(this.height);

        return true;
    }

    /**
     * it will recheck the validity of the block
     */
    async _validateBlockHash(previousHash) {

        if (this.computedBlockPrefix === null) this._computeBlockHeaderPrefix(); //making sure that the prefix was calculated for calculating the block

        //validate hashPrev
        if ( previousHash === null || (!Buffer.isBuffer(previousHash) && !WebDollarCryptoData.isWebDollarCryptoData(previousHash)) ) throw 'previous hash is not given'

        if (! previousHash.equals(this.hashPrev)) throw "block prevHash doesn't match";


        //validate hash
        let hash = await this.computeHash();

        if (!hash.equals(this.hash)) throw "block hash is not right";

        if (!await this.data.validateBlockData())
            return false;

        return true;

    }

    _validateTargetDifficulty(prevDifficultyTarget){


        if (prevDifficultyTarget instanceof BigInteger)
            prevDifficultyTarget = Serialization.serializeToFixedBuffer(consts.BLOCKS_POW_LENGTH, Serialization.serializeBigInteger(prevDifficultyTarget));

        if ( prevDifficultyTarget === null || (!Buffer.isBuffer(prevDifficultyTarget) && !WebDollarCryptoData.isWebDollarCryptoData(prevDifficultyTarget)) ) throw 'previousDifficultyTarget is not given'

        //console.log("difficulty block",this.height, "diff", prevDifficultyTarget.toString("hex"), "hash", this.hash.toString("hex"));

        if (! (this.hash.compare( prevDifficultyTarget ) <= 0))
            throw "block doesn't match the difficulty target is not ";

        return true;
    }

    toString(){

        return this.hashPrev.toString() + this.data.toString();

    }

    toJSON(){

        return {
            version: this.version,
            hashPrev: this.hashPrev,
            data: this.data.toJSON(),
            nonce: this.nonce,
            timeStamp: this.timeStamp,
        }

    }

    /*
        Concat of Hashes to avoid double computation
     */

    _computeBlockHeaderPrefix(skipPrefix){

        //in case I have calculated  the computedBlockPrefix before

        if (skipPrefix === true && Buffer.isBuffer(this.computedBlockPrefix) ){
            return this.computedBlockPrefix;
        }

        this.computedBlockPrefix = Buffer.concat ( [
                                                     Serialization.serializeToFixedBuffer( 2, Serialization.serializeNumber4Bytes( this.version) ),
                                                     Serialization.serializeToFixedBuffer( consts.BLOCKS_POW_LENGTH , this.hashPrev ),
                                                     Serialization.serializeToFixedBuffer( 4, Serialization.serializeNumber4Bytes( this.timeStamp )),
                                                     //data contains addressMiner, transactions history, contracts, etc
                                                     this.data.serializeData(),
                                                    ]);

        return this.computedBlockPrefix;
    }


    computeHash(newNonce){

        // hash is hashPow ( block header + nonce )

        let buffer = Buffer.concat ( [
                                       this.computedBlockPrefix,
                                       Serialization.serializeNumber4Bytes(newNonce||this.nonce ),
                                     ] );

        return WebDollarCrypto.hashPOW(buffer);
    }

    serializeBlock(){

        // serialize block is ( hash + nonce + header )

        this._computeBlockHeaderPrefix(true);
        let buffer = Buffer.concat( [
                                      this.hash,
                                      Serialization.serializeNumber4Bytes( this.nonce ),
                                      this.computedBlockPrefix,
                                    ]);

        return buffer;

    }

    deserializeBlock(buffer, height){

        let data = WebDollarCryptoData.createWebDollarCryptoData(buffer).buffer;
        let offset = 0;

        try {
            if (height >= 0) {

                this.hash = BufferExtend.substr(data, 0, consts.BLOCKS_POW_LENGTH);
                offset += consts.BLOCKS_POW_LENGTH;

                this.nonce = Serialization.deserializeNumber( BufferExtend.substr(data, offset, consts.BLOCKS_NONCE) );
                offset += consts.BLOCKS_NONCE;

                this.version = Serialization.deserializeNumber( BufferExtend.substr(data, offset, 2) );
                offset += 2;

                this.hashPrev = BufferExtend.substr(data, offset, consts.BLOCKS_POW_LENGTH);
                offset += consts.BLOCKS_POW_LENGTH;

                this.timeStamp = Serialization.deserializeNumber( BufferExtend.substr(data, offset, 4) );
                offset += 4;

                this.data.deserializeData(BufferExtend.substr(data, offset));
            }
        } catch (exception){
            console.log(colors.red("error deserializing a buffer"), exception);
            throw exception;
        }

    }

    async save(){

        let key = "block" + this.height;
        let bufferValue = this.serializeBlock();
    
        try{
            return (await this.db.save(key, bufferValue));
        }
        catch (err){
            return 'ERROR on SAVE block: ' + err;
        }
    }

    async load(){

        let key = "block" + this.height;
        
        try{
            let buffer = await this.db.get(key);
            this.deserializeBlock(buffer, this.height);
            return true;
        }
        catch(err) {
            return 'ERROR on LOAD block: ' + err;
        }
    }
    
    async remove() {
        
        let key = "block" + this.height;
        
        try{
            return (await this.db.remove(key));
        }
        catch(err) {
            return 'ERROR on REMOVE block: ' + err;
        }
    }

}

export default InterfaceBlockchainBlock;