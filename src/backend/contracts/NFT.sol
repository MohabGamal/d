// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract NFT is ERC721URIStorage {
    // == 0 by default
    uint public tokenCount;
    
    constructor() ERC721("Dapp NFT", "DAPP"){}
    // NFT Name, NFT Symbol 

    /**
    * @dev Minting means converting digital data to decentralized data
    * @param _tokenURI: address of the data on IPFS 
    **/
    function mint(string memory _tokenURI) external returns(uint) {
        tokenCount++;
        // token count here is the Id
        _safeMint(msg.sender, tokenCount);
        _setTokenURI(tokenCount, _tokenURI);
        return(tokenCount);
    }

}