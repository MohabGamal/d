// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Marketplace is ReentrancyGuard {
    address payable immutable feeAccount;
    uint public immutable feePrecent;
    uint public itemCount;

    struct Item{
        uint itemId;
        uint tokenId;
        uint price;
        IERC721 nft; // instance of abstract contract ERC721
        address payable seller;
        bool sold;
    }

	event Offered(
        uint itemId,
        uint tokenId,
        uint price,
        address indexed nft,
        address indexed seller
    );

    event Bought(
        uint itemId,
        uint tokenId,
        uint price,
        address indexed nft,
        address indexed seller,
        // we can make purchase history for the buyer through through event logs
        address indexed buyer
    );

    mapping (uint => Item) public items;

    constructor(uint _feePrecent) {
        feeAccount = payable(msg.sender);
        feePrecent = _feePrecent;
    }

    /**
    * @dev make Items in the store
    * @param _nft NFT contract address from only IERC721 token type
    * @notice nonReentrant modifier gurantees the function not getting called 
              again when the first is not finished yet for security reasons  
    **/
    function makeItem(IERC721 _nft, uint _tokenId, uint _price) external nonReentrant {
        require(_price > 0,"Price must be greater than 0");
        itemCount++;
        // transfer the NFT from the seller to the marketplace contract
        _nft.transferFrom (msg.sender, address(this), _tokenId);
        // add new Item struct to the mapping
        items[itemCount] = Item (
            itemCount,
            _tokenId,
            _price,
            _nft,    
            payable(msg.sender),
            false);

        emit Offered(
            itemCount,
            _tokenId,
            _price,
            address(_nft),
            msg.sender);
    }     

    function priceAfterSiteFees(uint _itemId) view public returns(uint){
        return items[_itemId].price*(100 + feePrecent)/100;
    }

    function purchaseItem(uint _itemId) external payable nonReentrant{
        uint _priceAfterSiteFees = priceAfterSiteFees(_itemId);
        // "storage" because we will update the struct data 
        Item storage item = items[_itemId];

        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");  
        require(msg.value >= _priceAfterSiteFees, "not enough coin for purchasing the item");
        require(!item.sold, "item is sold already!");
        //transfer item price to the seller 
        item.seller.transfer(item.price);
        // transfer fee price to the owner of contract
        feeAccount.transfer(_priceAfterSiteFees - item.price);
        item.sold = true;
        // transfer NFT token from the contract to the buyer
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);

        emit Bought(
            _itemId, 
            item.tokenId, 
            item.price, 
            address(item.nft), 
            item.seller, 
            msg.sender);
    }
}