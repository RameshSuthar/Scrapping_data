import cheerio from 'cheerio';
const axios = require('axios/dist/node/axios.cjs');

const domain = 'https://collabstr.com';
let currPageNumber = 0;

const data = {};

const getHTML = async (url) => {
    const res = await axios.get(domain + url);
    return res;
}

const getInfluencers = async (url) => {
    const html = await getHTML(url);
    const $ = cheerio.load(html.data);
    const paginatorLen = $('.pagination-arrow-holder').length
    let nextPageUrl = null;
    if(!!$('.pagination-arrow-holder')[`${paginatorLen - 1}`] && currPageNumber <= 26) {
        nextPageUrl = $('.pagination-arrow-holder')[`${paginatorLen - 1}`]['attribs']['href'];
        currPageNumber++;
    }
    $('.profile-listing-holder').each(function(i, element){
        let userData = {};
        let userId = null;
        let topLevelChild = element.childNodes;
        topLevelChild.forEach(function(node){
            if(node.name === "a") {
                userId = node.attribs.href.split('?')[0].substring(1);
            }
        });
        if(element.name === "a") {
            userId = element
        }
        recursiveTraversal(element, userData);
        data[userData['userName']] = {
            id: userId,
            profilePicUrl: userData['profilePicUrl'],
            location: userData['location'],
            title: userData['title'],
            fullName: userData['userName'],
        }
    });
    if(nextPageUrl) {
       await getInfluencers(nextPageUrl);
    } else {
       //await getMoreDataForEachUser();
    }
    console.log(data);
};

const recursiveTraversal = (node, data) => {
    let nestedChildNodes = node.childNodes;
    nestedChildNodes.forEach(function(nestedNode){
        if(node.name === "div" && node.attribs.class === "profile-listing-owner-name"){
            data['userName'] = node.children[0].data;
        } else if(node.name === "div" && node.attribs.class === "profile-listing-owner-location"){
            data['location'] = node.children[0].data;
        } else if(node.name === "h3" && node.attribs.class === "profile-listing-title"){
            data['title'] = node.children[0].data;
        } else if(nestedNode.name === "img"){
            data['profilePicUrl'] = nestedNode.attribs.src;
        } else if(nestedNode.childNodes) {
            recursiveTraversal(nestedNode, data);
        }
    });
}

const getMoreDataForEachUser = async () => {
    for(let user in data) {
        try {
            let endPoint = 'https://www.instagram.com/' + data[user].id;
            let { data: html } = await axios.get(endPoint);
            const $ = cheerio.load(html);
            const metaDescription = $("meta[name='description']").attr("content");
            if(metaDescription) {
                const arr = metaDescription.split(' ');
                data[user]['followers'] = arr[0];
                data[user]['following'] = arr[2];
                data[user]['totalPost'] = arr[4];
            }
        } catch(err) {
            //console.log(err);
        }
    }
}

getInfluencers('/influencers?p=instagram&c=Lifestyle+Travel+Food+%26+Drink+Art+%26+Photography+Music+%26+Dance+&f=10k-50k');

