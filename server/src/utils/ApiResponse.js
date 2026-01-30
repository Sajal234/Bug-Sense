
class ApiResponse {
    constructor(
        data,
        message = "request processed successfully"
    ){
        this.data = data;
        this.message = message;
        this.success = true
    }
}

export { ApiResponse };