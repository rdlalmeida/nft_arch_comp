import "NonFungibleToken"
import "MetadataViews"
import "FlowFees"

access(all) contract ExampleNFTContract: NonFungibleToken {
    access(all) let MinterStoragePath: StoragePath
    access(all) let CollectionStoragePath: StoragePath
    access(all) let CollectionPublicPath: PublicPath

    // Custom Events
    access(all) event NFTMinted(tokenId: UInt64)

    
    access(all) let parameter1: String


    /*
        Turns out that the latest Cadence upgrade (Octobre 2024) still has a bunch of problems, the biggest of them being the inability of capturing certain types of values from test scripts, I need to be a bit creative towards testing this contract properly. As such, I'm a bit limited to run scripts and transactions that encapsulate what I want to test given that the Test module is still ridden with hidden errors.
        Since transactions do not return values, I need to resort to Events to be able to test if the functions are working as they should. The next set of events serve this purpose only
    */
    access(all) event ViewsGotten(nftId: UInt64, nftType: Type, result: String)
    access(all) event ViewsResolved(nftId: UInt64, nftType: Type, result: String)
    access(all) event EmptyCollectionCreated(nftId: UInt64, nftType: Type, size: Int)

    access(all) resource ExampleNFT: NonFungibleToken.NFT {
        access(all) let id: UInt64

        // These fields are not that relevant for now, but I need to implement these function to implement the standard
        access(all) view fun getViews(): [Type] {
            // Emit the events fist before returning the result
            emit ViewsGotten(nftId: self.id, nftType: self.getType(), result: "[]")
            return [
            ]
        }

        access(all) fun resolveView(_ view: Type): AnyStruct? {
            emit ViewsResolved(nftId: self.id, nftType: self.getType(), result: "nil")
            return nil
        }

        access(all) fun createEmptyCollection(): @{NonFungibleToken.Collection} {
            let collection: @{NonFungibleToken.Collection} <- ExampleNFTContract.createEmptyCollection(nftType: Type<@ExampleNFTContract.ExampleNFT>())

            emit EmptyCollectionCreated(nftId: self.id, nftType: self.getType(), size: collection.getLength())

            return <- collection
        }
        
        init() {
            self.id = self.uuid
        }
    }
    
    access(all) resource NFTMinter {
        access(all) fun createNFT(): @ExampleNFT {
            let newToken: @ExampleNFT <- create ExampleNFT()

            emit NFTMinted(tokenId: newToken.id)

            return <- newToken
        }

        init() {

        }
    }

    access(all) resource Collection: NonFungibleToken.Collection {
        access(all) var ownedNFTs: @{UInt64: {NonFungibleToken.NFT}}

        access(all) view fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        access(all) view fun getSupportedNFTTypes(): {Type: Bool} {
            let supportedTypes: {Type: Bool} = {}
            supportedTypes[Type<@ExampleNFTContract.ExampleNFT>()] = true

            return supportedTypes
        }

        access(all) view fun isSupportedNFTType(type: Type): Bool {
            return type == Type<@ExampleNFTContract.ExampleNFT>()
        }

        access(all) view fun borrowNFT(_ id: UInt64): &{NonFungibleToken.NFT}? {
            return &self.ownedNFTs[id]
        }

        access(all) fun deposit(token: @{NonFungibleToken.NFT}) {
            let token: @ExampleNFTContract.ExampleNFT <- token as! @ExampleNFTContract.ExampleNFT

            // let id: UInt64 = token.id

            let oldToken: @AnyResource? <- self.ownedNFTs[token.id] <- token

            destroy oldToken
        }

        access(NonFungibleToken.Withdraw) fun withdraw(withdrawID: UInt64): @{NonFungibleToken.NFT} {
            let token: @{NonFungibleToken.NFT} <- self.ownedNFTs.remove(key: withdrawID) ??
            panic(
                "ExampleNFTContract.Collection.withdraw: Could not withdraw an NFT with ID"
                .concat(withdrawID.toString())
                .concat(". Check the submitted ID to make sure it is one that this collection owns."))

            return <- token
        }

        access(all) fun createEmptyCollection(): @{NonFungibleToken.Collection} {
            let collection: @{NonFungibleToken.Collection} <- ExampleNFTContract.createEmptyCollection(nftType: Type<@ExampleNFTContract.ExampleNFT>())

            emit EmptyCollectionCreated(nftId: 0, nftType: self.getType(), size: collection.getLength())

            return <- collection
        }

        init() {
            self.ownedNFTs <- {}
        }
    }

    access(all) view fun getContractViews(resourceType: Type?): [Type] {
        return []
    }

    access(all) fun resolveContractView(resourceType: Type?, viewType: Type): AnyStruct? {
        return nil
    }

    access(all) fun createEmptyCollection(nftType: Type):@{NonFungibleToken.Collection} {
        return <- create Collection()
    }

    access(all) fun saySomething(): String {
        return "This contract is working!"
    }

    access(all) fun sayThings(things: String): String {
        return "Words are being concatenated: ".concat(things);
    }


    init(par1: String) {
        self.MinterStoragePath = /storage/exampleMinter
        self.CollectionStoragePath = /storage/exampleNFTCollection
        self.CollectionPublicPath = /public/exampleNFTCollection

        self.parameter1 = par1

        log(
            self.parameter1
        )

        // Clean the storage spot for the Minter in storage first. Whenever I amend a deployed contract, the Minter never gets deleted after deleting the contract
        let randomMinter: @AnyResource? <- self.account.storage.load<@AnyResource>(from: self.MinterStoragePath);

        // Destroy whatever may have been in storage to clear the space for the new Minter
        destroy randomMinter

        // TODO: Added the type of resource to store. Check if this might resolve the minting problem I was getting before
        self.account.storage.save<@ExampleNFTContract.NFTMinter>(<- create NFTMinter(), to: self.MinterStoragePath)
    }
}