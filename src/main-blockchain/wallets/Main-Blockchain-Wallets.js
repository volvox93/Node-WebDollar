import MiniBlockchainAddress from 'common/blockchain/mini-blockchain/Mini-Blockchain-Address'
import InterfaceSatoshminDB from 'common/satoshmindb/Interface-SatoshminDB'
import WebDollarCryptoData from 'common/crypto/WebDollar-Crypto-Data'
import Serialization from "common/utils/Serialization.js";
import BufferExtended from "common/utils/BufferExtended.js";

class MainBlockchainWallets{

    constructor(blockchain, password = 'password', db){

        this.blockchain = blockchain;
        this.walletFileName = 'wallet.bin';
        
        if(typeof db === "undefined")
            this.db = new InterfaceSatoshminDB();
        else
            this.db = db;


        this.addresses = [];
        
        this.password = password;
        
        if (this.loadAddresses() !== true) {
            this.addresses = [this.createNewAddress()];
            this.saveAddresses();
        }

    }

    createNewAddress(){

        let blockchainAddress = new MiniBlockchainAddress();
        blockchainAddress.createNewAddress();

        return blockchainAddress;
    }
    
    async updatePassword(newPassword){

        await this.loadAddresses();

        this.password = newPassword;
        
        await this.saveAddresses();
    }
    
    serialize() {
        
        let list = [Serialization.serializeNumber4Bytes(this.addresses.length)];

        for (let i = 0; i < this.addresses.length; ++i) {
            let walletBuffer = this.addresses[i].serializeAddress();
            list.push(walletBuffer);
        }

        return Buffer.concat (list);
    }
    
    deserialize(buffer) {

        let data = WebDollarCryptoData.createWebDollarCryptoData(buffer).buffer;
        let offset = 0;

        try {

            let numAddresses = Serialization.deserializeNumber( BufferExtended.substr(data, offset, 4) );
            offset += 4;
            
            this.addresses = [];
            for (let i = 0; i < numAddresses; ++i) {
                this.addresses[i] = this.createNewAddress();
                offset += this.addresses[i].deserializeAddress( BufferExtended.substr(buffer, offset) );
            }

        } catch (exception){
            console.log("error deserializing a Wallet. ", exception);
            throw exception;
        }
    }
    
    async saveAddresses() {
        
        for (let i = 0; i < this.addresses.length; ++i)
            this.addresses[i].encrypt(this.password);

        let value = this.serialize();  

        for (let i = 0; i < this.addresses.length; ++i)
            this.addresses[i].decrypt(this.password);

        return (await this.db.save(this.walletFileName, value));
    }
    
    async loadAddresses() {
        
        let buffer = await this.db.get(this.walletFileName);
        
        if (typeof buffer.status !== "undefined")
            return false;

        this.deserialize(buffer);

        for (let i = 0; i < this.addresses.length; ++i)
            this.addresses[i].decrypt(this.password);

        return true;
    }
    
    async remodeAddresses() {

        return (await this.db.remove(this.walletFileName));
    }

}

export default MainBlockchainWallets