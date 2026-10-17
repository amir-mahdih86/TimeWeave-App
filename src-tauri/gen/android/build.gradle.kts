buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.11.0")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.25")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
    // Keep transitive dependency versions aligned with artifacts that are
    // available everywhere (some networks geo-block dl.google.com, so a build
    // only succeeds when every artifact is cached or resolvable from both).
    configurations.all {
        resolutionStrategy {
            force("androidx.emoji2:emoji2:1.3.0")
            force("androidx.emoji2:emoji2-views-helper:1.3.0")
            force("androidx.lifecycle:lifecycle-process:2.10.0")
            force("androidx.concurrent:concurrent-futures:1.1.0")
            force("androidx.annotation:annotation-experimental:1.4.1")
        }
    }
}

// Disable AGP lint / annotation-extraction tasks: they pull tool jars from
// dl.google.com, which some networks geo-block. Lint is not required to
// produce the APK.
apply(from = "disableLint.gradle")

tasks.register("clean").configure {
    delete("build")
}

