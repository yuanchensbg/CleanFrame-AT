plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.cleanframe.at"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.cleanframe.at"
        minSdk = 22
        targetSdk = 34
        versionCode = 3
        versionName = "1.2"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    lint {
        abortOnError = false
    }
}
