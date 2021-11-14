const request = async (url,data,method) => {
    method = method || (!data ? 'GET' : 'POST')
    const res = await handleFetchResponse(await fetch(url, {method:method,body:JSON.stringify(data),headers:{'content-type':'application/json'}}))
    return await res.json()
}

const upload = async (url,formdata,headers) => {
    let res = await handleFetchResponse(await fetch(url, {method:'POST',body:formdata,headers}))
    return await res.text()
}

const handleFetchResponse = async (res) => {
    if(res.status >= 400){
        res = await res.text()
        alert(res)
        return
    }
    return res
}