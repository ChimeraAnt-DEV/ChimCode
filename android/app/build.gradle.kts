plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Release signing is optional. When a keystore is supplied through the
// environment (see android/README) the release build is signed, otherwise it
// falls back to the debug signing config so local builds always work.
val envKeystore: String? = System.getenv("CHIMCODE_KEYSTORE")
val envStorePassword: String? = System.getenv("CHIMCODE_KEYSTORE_PASSWORD")
val envKeyAlias: String? = System.getenv("CHIMCODE_KEY_ALIAS")
val envKeyPassword: String? = System.getenv("CHIMCODE_KEY_PASSWORD")

android {
    namespace = "dev.chimera.chimcode"
    compileSdk = 34

    defaultConfig {
        applicationId = "dev.chimera.chimcode"
        minSdk = 24
        targetSdk = 34
        versionCode = 2
        versionName = "1.1.0"
    }

    signingConfigs {
        if (envKeystore != null && envStorePassword != null && envKeyAlias != null && envKeyPassword != null) {
            create("release") {
                storeFile = file(envKeystore)
                storePassword = envStorePassword
                keyAlias = envKeyAlias
                keyPassword = envKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = if (signingConfigs.findByName("release") != null) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        viewBinding = false
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("com.google.android.material:material:1.12.0")
}

// Bundle the web app so the APK runs with no server at all.
val copyWebAssets = tasks.register<Copy>("copyWebAssets") {
    from(rootProject.file("../frontend"))
    into(layout.projectDirectory.dir("src/main/assets/www"))
    exclude("assets/icon/make_icons.py")
}

tasks.named("preBuild") { dependsOn(copyWebAssets) }
