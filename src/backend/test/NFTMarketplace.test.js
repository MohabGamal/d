/* eslint-disable no-undef */
/* eslint-disable jest/valid-expect */
const {expect} = require('chai');
const chai = require('chai');
const chaiAlmost = require('chai-almost');
chai.use(chaiAlmost());

const toWei = (num) => ethers.utils.parseEther(num.toString())
const toEther = (num) => ethers.utils.formatEther(num)

describe('NFTMarketplace', () => {
    let deployer, addr1, addr2, nft, marketplace
    let feePercent = 2
    let URI = "sample URI"
    
    beforeEach(async () => {
    [deployer, addr1, addr2] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory('NFT');
    const Marketplace = await ethers.getContractFactory('Marketplace');
    nft = await NFT.deploy();
    marketplace = await Marketplace.deploy(feePercent);
    })

    describe('Deployment', () => {

        it('should track the name and symbol of the nft collection', async () => {
            expect(await nft.name()).to.equal("Dapp NFT")
            expect(await nft.symbol()).to.equal("DAPP")
        })
    })

    describe('Minting NFT', () => {

        it('should track each minted NFT', async () => {
            await nft.connect(addr1).mint(URI)
            expect(await nft.tokenCount()).to.equal(1)
            expect(await nft.balanceOf(addr1.address)).to.equal(1)
            expect(await nft.tokenURI(1)).to.equal(URI)
            // tokenURI(tokenId) is inherted from ERC721URIStorage 

            await nft.connect(addr2).mint(URI)
            expect(await nft.tokenCount()).to.equal(2)
            expect(await nft.balanceOf(addr2.address)).to.equal(1)
            expect(await nft.tokenURI(2)).to.equal(URI)
        })
    })

    describe('Creating marketplace items', () => {
        beforeEach(async () => {
            await nft.connect(addr1).mint(URI)
            // addr1 (caller) approves to send nft to marketplace (operator)
            await nft.connect(addr1).setApprovalForAll(marketplace.address, true)
        })

        it('Create new items, transfer NFT, emit Offered event', async () => {
            //await marketplace.connect(addr1).makeItem(nft.address, 1, toWei(3))
            await expect(marketplace.connect(addr1).makeItem(nft.address, 1, toWei(3)))
            .to.emit(marketplace, "Offered")
            // expect to emit these results 
            .withArgs(
                1,  // item id
                1, // token ID
                toWei(3), // price
                nft.address,
                addr1.address)

            // expect the new owner of the nft (1) is marketplace contract
            // ownerOF(tokenId) is inherted from ERC721URIStorage
            expect(await nft.ownerOf(1)).to.equal(marketplace.address)
            expect(await marketplace.itemCount()).to.equal(1)
            
            const item = await marketplace.items(1)
            expect(item.itemId).to.equal(1)
            expect(item.nft).to.equal(nft.address)
            expect(item.tokenId).to.equal(1)
            expect(item.price).to.equal(toWei(3))
            expect(item.sold).to.equal(false)
        })

        // fail test when price lower than 1
        it('should fail when price is 0', async() => {
            await expect(
                marketplace.connect(addr1).makeItem(nft.address, 1, 0)) // 0 price
                .to.be.revertedWith("Price must be greater than 0")
        })
    })
    
    describe("Purchasing marketplace item", () => {
        let price = 2
        let totalPriceInWei
        beforeEach( async () => {
            await nft.connect(addr1).mint(URI)
            await nft.connect(addr1).setApprovalForAll(marketplace.address, true)
            await marketplace.connect(addr1).makeItem(nft.address, 1, toWei(price))
        })

        it('update item to be sold, pay seller, transfer NFT to buyer, charge fees, emit Bought event', async () => {
            const sellerInitalEthBal = await addr1.getBalance()
            const feeAccountInitialEthBal = await deployer.getBalance()
            totalPriceInWei = await marketplace.priceAfterSiteFees(1)// _itemId
            // addr 1 (seller), addr2 (buyer)
            await expect(marketplace.connect(addr2).purchaseItem(1, {value: totalPriceInWei}))
            .to.emit(marketplace, "Bought").withArgs(
                1,
                1,
                toWei(price),
                nft.address,
                addr1.address,
                addr2.address
            )
            const sellerFinalEthBal = await addr1.getBalance()
            const feeAccountFinalEthBal = await deployer.getBalance()
            // Item should be marked as sold
            expect((await marketplace.items(1)).sold).to.equal(true)
            const fee = (feePercent / 100) * price
            // Seller should receive payment for the price of the NFT sold.
            expect(+toEther(sellerFinalEthBal)).to.be.almost(+price + +toEther(sellerInitalEthBal))
            // feeAccount should receive fee
            expect(+toEther(feeAccountFinalEthBal)).to.be.almost(+fee + +toEther(feeAccountInitialEthBal))
            
            expect(await nft.ownerOf(1)).to.equal(addr2.address)
        })
        
        it("Should fail for invalid item ids, sold items and when not enough ether is paid", async function () {
            // fails for invalid item ids
            await expect(
              marketplace.connect(addr2).purchaseItem(2, {value: totalPriceInWei})
            ).to.be.revertedWith("item doesn't exist");
            await expect(
              marketplace.connect(addr2).purchaseItem(0, {value: totalPriceInWei})
            ).to.be.revertedWith("item doesn't exist");
            // Fails when not enough ether is paid with the transaction. 
            // In this instance, fails when buyer only sends enough ether to cover the price of the nft
            // not the additional market fee.
            await expect(
              marketplace.connect(addr2).purchaseItem(1, {value: toWei(price)})
            ).to.be.revertedWith("not enough coin for purchasing the item"); 
            // addr2 purchases item 1
            await marketplace.connect(addr2).purchaseItem(1, {value: totalPriceInWei})
            // addr3 tries purchasing item 1 after its been sold 
            await expect(
              marketplace.connect(deployer).purchaseItem(1, {value: totalPriceInWei})
            ).to.be.revertedWith("item is sold already!");
        })
    })
})