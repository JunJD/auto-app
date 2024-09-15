use axum::{
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize};
use tower_http::trace::TraceLayer;

#[derive(Deserialize)]
struct GetCarNumRequest {
    token: String,
    cjhurl: String,
}

#[derive(Serialize)]
struct GetCarNumResponse {
    #[serde(flatten)]
    data: serde_json::Value,
    url: String,
}

async fn get_car_num(Json(req): Json<GetCarNumRequest>) -> impl IntoResponse {
    let url = format!("https://jgjfjdcgl.gat.zj.gov.cn:5102/inf_zpm/hz_mysql_api/BatteryBinding/hgzinfoquery?token={}&cjhurl={}", req.token, req.cjhurl);

    match reqwest::get(&url).await {
        Ok(response) => {
            let data: serde_json::Value = response.json().await.map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to parse response as JSON",
                )
            })?;
            let response = GetCarNumResponse {
                data,
                url: url.clone(),
            };
            (StatusCode::OK, Json(response))
        }
        Err(_) => {
            (
                StatusCode::BAD_GATEWAY,
                "Failed to fetch data from external API",
            )
        }
    }
}

pub fn init_routes() -> Router {
    Router::new().route("/api/getCarNum", post(get_car_num)).layer(TraceLayer::new_for_http())
}