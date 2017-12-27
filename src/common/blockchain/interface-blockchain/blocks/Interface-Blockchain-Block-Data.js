import BufferExtended from "common/utils/BufferExtended"
import WebDollarCrypto from 'common/crypto/WebDollar-Crypto'
import consts from 'consts/const_global'
import Serialization from 'common/utils/Serialization'

import BlockchainGenesis from 'common/blockchain/global/Blockchain-Genesis'

class InterfaceBlockchainBlockData {

    constructor(blockchain, minerAddress, transactions, hashTransactions, hashData){

        this.blockchain = blockchain;

        if (minerAddress === undefined)
            minerAddress = BlockchainGenesis.address;


        if (!Buffer.isBuffer(minerAddress))
            minerAddress = Buffer.from(minerAddress);

        if (minerAddress === "string")
            WebDollarCrypto.fromBase(minerAddress);

        this.minerAddress = minerAddress;

        this.transactions = transactions||[];

        if (hashTransactions === undefined)
            hashTransactions = this.calculateHashTransactions();

        this.hashTransactions = hashTransactions;

        this.hashData = hashData;

        if (hashData === undefined || hashData === null)
            this.calculateHashBlockData();

    }

    validateBlockData(){

        if (this.minerAddress === undefined || this.minerAddress === null || !Buffer.isBuffer(this.minerAddress)  ) throw ('data.minerAddress is empty');

        if (this.hashData === undefined || this.hashData === null || !Buffer.isBuffer(this.hashData)) throw ('hashData is empty');

        //validate hash
        let hashData = this.calculateHashBlockData();

        if (!hashData.equals(this.hashData)) throw "block.data hashData is not right";

        return true;
    }

    computeHashBlockData(){
        this.hashData = this.calculateHashBlockData();
    }

    calculateHashBlockData(){
        // sha256 (sha256 ( serialized ))
        return WebDollarCrypto.SHA256 ( WebDollarCrypto.SHA256( this._computeBlockDataHeaderPrefix() ));
    }

    calculateHashTransactions (){
        return WebDollarCrypto.SHA256 ( WebDollarCrypto.SHA256( this._computeBlockDataTransactionsConcatenate() ));
    }

    _computeBlockDataTransactionsConcatenate(){

        let bufferList = [];

        for (let i=0; i<this.transactions.length; i++)
            bufferList.push( this.transactions[i].serializeTransaction() );

        return Buffer.concat( bufferList )

    }

    _computeBlockDataHeaderPrefix(){

        return Buffer.concat ( [
            Serialization.serializeToFixedBuffer( consts.PUBLIC_ADDRESS_LENGTH, this.minerAddress ),
            Serialization.serializeToFixedBuffer( 32, this.hashTransactions ),
        ]);

    }

    /**
     convert data to Buffer
     **/
    serializeData(){

        if (!Buffer.isBuffer(this.hashData) || this.hashData.length !== 32)
            this.computeHashBlockData();

        return Buffer.concat( [
            Serialization.serializeToFixedBuffer( 32, this.hashData ),
            this._computeBlockDataHeaderPrefix(),
        ] )

    }

    deserializeData(buffer){


        let offset = 0;
        this.data = {};

        this.hashData = BufferExtended.substr(buffer, offset, 32);
        offset += 32;

        this.minerAddress = BufferExtended.substr(buffer, offset, consts.PUBLIC_ADDRESS_LENGTH);
        offset += consts.PUBLIC_ADDRESS_LENGTH;

        return offset;
    }

    toString(){

        return this.minerAddress.toString("hex") + this.hashData.toString("hex")

    }

    toJSON(){
        return {
            minerAddress:this.minerAddress,
            hashData: this.hashData.toString("hex"),
        };
    }


}

export default InterfaceBlockchainBlockData;