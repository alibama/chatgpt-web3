// App.js

import React, { useState } from "react";
import Web3 from "web3";
import { create as ipfsHttpClient } from "ipfs-http-client";
import { NFTStorage, File } from "nft.storage";
import { abi as erc721Abi } from "./MyNFT.json";

const web3 = new Web3(Web3.givenProvider);
const contractAddress = "0x..."; // Replace with your contract address
const contract = new web3.eth.Contract(erc721Abi, contractAddress);

const ipfsEndpoint = "https://ipfs.infura.io:5001/api/v0";
const ipfs = ipfsHttpClient(ipfsEndpoint);

const nftStorageApiKey = "..."; // Replace with your NFT.Storage API key
const nftStorageClient = new NFTStorage({ token: nftStorageApiKey });

function App() {
  const [recipientAddress, setRecipientAddress] = useState("");
  const [fileUrl, setFileUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState(null);

  const mintNFT = async (fileUrl, metadataUrl) => {
    try {
      setIsMinting(true);
      const accounts = await web3.eth.getAccounts();
      const tokenId = Math.floor(Math.random() * 1000000); // Generate random tokenId
      await contract.methods.mintTokenTo(recipientAddress, tokenId).send({ from: accounts[0] });

      const metadataFile = new File([JSON.stringify(metadataUrl)], "metadata.json", { type: "application/json" });
      const metadataCid = await nftStorageClient.storeBlob(metadataFile);

      const tokenImageFile = await fetch(fileUrl).then((res) => res.blob());
      const tokenImage = new File([tokenImageFile], "token.jpg", { type: "image/jpg" });
      const tokenImageCid = await nftStorageClient.storeBlob(tokenImage);

      const tokenUrl = `https://ipfs.io/ipfs/${tokenImageCid}`;
      const metadataUrl = `https://ipfs.io/ipfs/${metadataCid}`;

      const tokenURI = `https://gateway.pinata.cloud/ipfs/${metadataCid}`;
      await contract.methods.setTokenURI(tokenId, tokenURI).send({ from: accounts[0] });

      setIsMinting(false);
      setRecipientAddress("");
      setFileUrl(null);
      alert(`Successfully minted NFT with tokenId ${tokenId}`);
    } catch (error) {
      console.error(error);
      setIsMinting(false);
      setError(error.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const file = await ipfs.add(await fetch(fileUrl).then((res) => res.blob()));
      const metadata = {
        name: "My NFT",
        description: "This is my NFT",
        image: `https://ipfs.io/ipfs/${file.path}`,
        attributes: [
          {
            trait_type: "Recipient Address",
            value: recipientAddress,
          },
        ],
      };
      const metadataUrl = `data:application/json,${JSON.stringify(metadata)}`;
      await mintNFT(fileUrl, metadataUrl);
    } catch (error)
