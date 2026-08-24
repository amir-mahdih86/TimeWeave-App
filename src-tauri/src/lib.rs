use serde::Serialize;

#[derive(Serialize)]
pub struct PermissionStatus {
    pub notifications: bool,
    pub exact_alarms: bool,
    pub battery_exempt: bool,
}

#[cfg(target_os = "android")]
mod android {
    use super::PermissionStatus;
    use jni::objects::{JClass, JObject, JString, JValue, JValueOwned};
    use jni::JNIEnv;
    use tauri::{AppHandle, Manager};

    const BRIDGE_CLASS: &str = "com.amir.timeweave.alarms.AlarmBridge";

    // Runs a closure with (JNIEnv, Activity) on the webview's thread using
    // wry's JniHandle. This is required because Tauri does not initialize
    // ndk-context, and getAppClass gives us the APK class loader needed to
    // resolve app classes from JNI.
    fn with_webview_jni<T, F>(app: &AppHandle, label: &str, f: F) -> Result<T, String>
    where
        T: Send + 'static,
        F: FnOnce(&mut JNIEnv, &JObject) -> jni::errors::Result<T> + Send + 'static,
    {
        log::info!("[alarms] {label}: dispatching to webview thread");
        let webview_window = app
            .get_webview_window("main")
            .ok_or_else(|| "main webview window not found".to_string())?;
        let (tx, rx) = std::sync::mpsc::channel();
        let _ = webview_window.with_webview(move |platform_webview| {
            let jni_handle = platform_webview.jni_handle();
            jni_handle.exec(move |env, activity, _webview| {
                let result = f(env, activity);
                let _ = tx.send(result);
            });
        });
        match rx.recv_timeout(std::time::Duration::from_secs(10)) {
            Ok(Ok(value)) => {
                log::info!("[alarms] {label}: ok");
                Ok(value)
            }
            Ok(Err(e)) => {
                log::warn!("[alarms] {label}: jni error: {e}");
                Err(format!("jni error: {e}"))
            }
            Err(e) => {
                log::warn!("[alarms] {label}: dispatch failed: {e}");
                Err(format!("jni dispatch failed: {e}"))
            }
        }
    }

    fn bridge_class<'a>(
        env: &mut JNIEnv<'a>,
        activity: &JObject<'_>,
    ) -> jni::errors::Result<JClass<'a>> {
        let name = env.new_string(BRIDGE_CLASS)?;
        let cls = env
            .call_method(
                activity,
                "getAppClass",
                "(Ljava/lang/String;)Ljava/lang/Class;",
                &[(&name).into()],
            )?
            .l()?;
        Ok(cls.into())
    }

    fn call_static<'a>(
        env: &mut JNIEnv<'a>,
        class: &JClass,
        name: &str,
        sig: &str,
        args: &[JValue],
    ) -> jni::errors::Result<JValueOwned<'a>> {
        env.call_static_method(class, name, sig, args)
    }

    pub fn init_notifications(app: &AppHandle) -> Result<(), String> {
        with_webview_jni(app, "initChannels", |env, activity| {
            let class = bridge_class(env, activity)?;
            call_static(
                env,
                &class,
                "initChannels",
                "(Landroid/content/Context;)V",
                &[activity.into()],
            )?;
            Ok(())
        })
    }

    pub fn get_permission_status(app: &AppHandle) -> Result<PermissionStatus, String> {
        with_webview_jni(app, "getPermissionStatus", |env, activity| {
            let class = bridge_class(env, activity)?;

            let notifications = call_static(
                env,
                &class,
                "notificationPermissionGranted",
                "(Landroid/content/Context;)Z",
                &[activity.into()],
            )?
            .z()?;
            let exact_alarms = call_static(
                env,
                &class,
                "exactAlarmsPermitted",
                "(Landroid/content/Context;)Z",
                &[activity.into()],
            )?
            .z()?;
            let battery_exempt = call_static(
                env,
                &class,
                "isIgnoringBatteryOptimizations",
                "(Landroid/content/Context;)Z",
                &[activity.into()],
            )?
            .z()?;

            Ok(PermissionStatus {
                notifications,
                exact_alarms,
                battery_exempt,
            })
        })
    }

    pub fn request_notification_permission(app: &AppHandle) -> Result<bool, String> {
        with_webview_jni(app, "requestNotificationPermission", |env, activity| {
            let class = bridge_class(env, activity)?;
            let granted = call_static(
                env,
                &class,
                "requestNotificationPermission",
                "(Landroid/app/Activity;)Z",
                &[activity.into()],
            )?
            .z()?;
            Ok(granted)
        })
    }

    pub fn open_exact_alarm_settings(app: &AppHandle) -> Result<(), String> {
        with_webview_jni(app, "openExactAlarmSettings", |env, activity| {
            let class = bridge_class(env, activity)?;
            call_static(
                env,
                &class,
                "openExactAlarmSettings",
                "(Landroid/app/Activity;)V",
                &[activity.into()],
            )?;
            Ok(())
        })
    }

    pub fn request_ignore_battery_optimizations(app: &AppHandle) -> Result<bool, String> {
        with_webview_jni(app, "requestBatteryExemption", |env, activity| {
            let class = bridge_class(env, activity)?;
            let granted = call_static(
                env,
                &class,
                "requestIgnoreBatteryOptimizations",
                "(Landroid/app/Activity;)Z",
                &[activity.into()],
            )?
            .z()?;
            Ok(granted)
        })
    }

    pub fn schedule_task_alarm(
        app: &AppHandle,
        id: String,
        title: String,
        body: String,
        fire_at_millis: i64,
        full_alarm: bool,
    ) -> Result<(), String> {
        log::info!("[alarms] scheduling alarm id={id} at={fire_at_millis} full={full_alarm}");
        with_webview_jni(app, "scheduleAlarm", move |env, activity| {
            let class = bridge_class(env, activity)?;
            let jid: JObject = env.new_string(&id)?.into();
            let jtitle: JObject = env.new_string(&title)?.into();
            let jbody: JObject = env.new_string(&body)?.into();
            call_static(
                env,
                &class,
                "scheduleAlarm",
                "(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;JZ)V",
                &[
                    activity.into(),
                    (&jid).into(),
                    (&jtitle).into(),
                    (&jbody).into(),
                    fire_at_millis.into(),
                    (full_alarm as u8).into(),
                ],
            )?;
            Ok(())
        })
    }

    pub fn cancel_task_alarm(app: &AppHandle, id: String) -> Result<(), String> {
        with_webview_jni(app, "cancelAlarm", move |env, activity| {
            let class = bridge_class(env, activity)?;
            let jid: JObject = env.new_string(&id)?.into();
            call_static(
                env,
                &class,
                "cancelAlarm",
                "(Landroid/content/Context;Ljava/lang/String;)V",
                &[activity.into(), (&jid).into()],
            )?;
            Ok(())
        })
    }

    pub fn scheduled_alarm_ids(app: &AppHandle) -> Result<Vec<String>, String> {
        let joined = with_webview_jni(app, "scheduledAlarmIds", |env, activity| {
            let class = bridge_class(env, activity)?;
            let result = call_static(
                env,
                &class,
                "scheduledAlarmIds",
                "(Landroid/content/Context;)Ljava/lang/String;",
                &[activity.into()],
            )?;
            let obj = result.l()?;
            let s: String = env.get_string(&JString::from(obj))?.into();
            Ok(s)
        })?;
        if joined.is_empty() {
            Ok(Vec::new())
        } else {
            Ok(joined.split('|').map(|s| s.to_string()).collect())
        }
    }
}

#[cfg(target_os = "android")]
use android as platform;

#[cfg(not(target_os = "android"))]
mod platform {
    use super::PermissionStatus;
    use tauri::AppHandle;

    pub fn init_notifications(_app: &AppHandle) -> Result<(), String> {
        log::info!("notifications are only available on Android");
        Ok(())
    }

    pub fn get_permission_status(_app: &AppHandle) -> Result<PermissionStatus, String> {
        Ok(PermissionStatus {
            notifications: true,
            exact_alarms: true,
            battery_exempt: true,
        })
    }

    pub fn request_notification_permission(_app: &AppHandle) -> Result<bool, String> {
        Ok(true)
    }

    pub fn open_exact_alarm_settings(_app: &AppHandle) -> Result<(), String> {
        Ok(())
    }

    pub fn request_ignore_battery_optimizations(_app: &AppHandle) -> Result<bool, String> {
        Ok(true)
    }

    pub fn schedule_task_alarm(
        app: &AppHandle,
        id: String,
        _title: String,
        _body: String,
        fire_at_millis: i64,
        _full_alarm: bool,
    ) -> Result<(), String> {
        log::info!(
            "schedule_task_alarm (desktop stub): {} at {}",
            id,
            fire_at_millis
        );
        let _ = app;
        Ok(())
    }

    pub fn cancel_task_alarm(_app: &AppHandle, _id: String) -> Result<(), String> {
        Ok(())
    }

    pub fn scheduled_alarm_ids(_app: &AppHandle) -> Result<Vec<String>, String> {
        Ok(Vec::new())
    }
}

#[tauri::command]
fn init_notifications(app: tauri::AppHandle) -> Result<(), String> {
    platform::init_notifications(&app)
}

#[tauri::command]
fn get_permission_status(app: tauri::AppHandle) -> Result<PermissionStatus, String> {
    platform::get_permission_status(&app)
}

#[tauri::command]
fn request_notification_permission(app: tauri::AppHandle) -> Result<bool, String> {
    platform::request_notification_permission(&app)
}

#[tauri::command]
fn open_exact_alarm_settings(app: tauri::AppHandle) -> Result<(), String> {
    platform::open_exact_alarm_settings(&app)
}

#[tauri::command]
fn request_ignore_battery_optimizations(app: tauri::AppHandle) -> Result<bool, String> {
    platform::request_ignore_battery_optimizations(&app)
}

#[tauri::command]
fn schedule_task_alarm(
    app: tauri::AppHandle,
    id: String,
    title: String,
    body: String,
    fire_at_millis: i64,
    full_alarm: bool,
) -> Result<(), String> {
    platform::schedule_task_alarm(&app, id, title, body, fire_at_millis, full_alarm)
}

#[tauri::command]
fn cancel_task_alarm(app: tauri::AppHandle, id: String) -> Result<(), String> {
    platform::cancel_task_alarm(&app, id)
}

#[tauri::command]
fn scheduled_alarm_ids(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    platform::scheduled_alarm_ids(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      init_notifications,
      get_permission_status,
      request_notification_permission,
      open_exact_alarm_settings,
      request_ignore_battery_optimizations,
      schedule_task_alarm,
      cancel_task_alarm,
      scheduled_alarm_ids,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
